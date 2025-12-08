import User from '../models/User.js';
import Event from '../models/Event.js';
import { sendMail, renderTemplate } from '../utils/mailer.js';
import { logActivity } from './adminActivityController.js';

export async function listAllCoordinators(req, res) {
  try {
    const { search } = req.query;
    let query = { role: 'coordinator' };

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query = {
        role: 'coordinator',
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { coordinatorId: searchRegex },
        ],
      };
    }

    const users = await User.find(query)
      .select('name email coordinatorId createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Compute dynamic student assignment counts per coordinator
    const coordinatorIds = users.map(u => (u.coordinatorId || '').trim()).filter(Boolean);
    let countsMap = new Map();
    if (coordinatorIds.length) {
      // Count students assigned to a coordinator by either teacherId (preferred linkage)
      // or fallback to student.coordinatorId if data was populated that way.
    const pipeline = [
      {
        $match: {
          role: 'student',
          $or: [
            { teacherId: { $in: coordinatorIds } },
            { coordinatorId: { $in: coordinatorIds } },
          ],
        },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $and: [ { $ne: ['$teacherId', null] }, { $ne: ['$teacherId', ''] } ] },
              '$teacherId',
              '$coordinatorId',
            ],
          },
          count: { $sum: 1 },
        },
      },
    ];
    const counts = await User.aggregate(pipeline);
    countsMap = new Map(counts.map(c => [c._id, c.count]));
  }

  // Count events created by each coordinator
  const eventsPipeline = [
    {
      $match: {
        coordinatorId: { $in: coordinatorIds }
      }
    },
    {
      $group: {
        _id: '$coordinatorId',
        regularEvents: {
          $sum: { $cond: [{ $eq: ['$isSpecial', false] }, 1, 0] }
        },
        specialEvents: {
          $sum: { $cond: [{ $eq: ['$isSpecial', true] }, 1, 0] }
        },
        totalEvents: { $sum: 1 }
      }
    }
  ];
  const eventCounts = await Event.aggregate(eventsPipeline);
  const eventsMap = new Map(eventCounts.map(e => [e._id, {
    regular: e.regularEvents,
    special: e.specialEvents,
    total: e.totalEvents
  }]));

  const enriched = users.map(u => ({
    ...u,
    studentsAssigned: countsMap.get(u.coordinatorId) || 0,
    eventsCreated: eventsMap.get(u.coordinatorId) || { regular: 0, special: 0, total: 0 }
  }));    res.json({ count: enriched.length, coordinators: enriched });
  } catch (err) {
    console.error('Error listing coordinators:', err);
    res.status(500).json({ error: 'Failed to fetch coordinators' });
  }
}

export async function createCoordinator(req, res) {
  try {
    const { coordinatorName, coordinatorEmail, coordinatorPassword, coordinatorID } = req.body || {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!coordinatorName || !coordinatorEmail || !coordinatorID) {
      return res.status(400).json({ error: 'Missing required fields (coordinatorName, coordinatorEmail, coordinatorID)' });
    }
    if (!emailRegex.test(coordinatorEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const exists = await User.findOne({ $or: [{ email: coordinatorEmail }, { coordinatorId: coordinatorID }] });
    if (exists) return res.status(409).json({ error: 'Coordinator with email or coordinatorID already exists' });

    const defaultPassword = coordinatorPassword || coordinatorID;
    const passwordHash = await User.hashPassword(defaultPassword);
    const user = await User.create({
      role: 'coordinator',
      name: coordinatorName,
      email: coordinatorEmail,
      coordinatorId: coordinatorID,
      passwordHash,
      mustChangePassword: true,
    });

    // Send onboarding email to coordinator
    if (process.env.EMAIL_ON_ONBOARD === 'true' && user.email) {
      const subject = 'Coordinator Account Created - Your Credentials';
      const html = `
        <div style="font-family:Arial,sans-serif;font-size:15px;color:#222;max-width:600px;">
          <p style="margin-bottom:16px;">Dear {name},</p>
          <p style="margin-bottom:12px;">Your <strong>Coordinator</strong> account has been created.</p>
          <div style="background:#f0f9ff;padding:16px;border-radius:8px;border-left:4px solid #0ea5e9;margin:16px 0;">
            <table style="width:100%;font-size:15px;">
              <tr><td style="padding:6px 0;width:40%;color:#475569;"><strong>Coordinator ID:</strong></td><td style="padding:6px 0;color:#0f172a;font-weight:600;">{coordinatorId}</td></tr>
              <tr><td style="padding:6px 0;color:#475569;"><strong>Email:</strong></td><td style="padding:6px 0;color:#0f172a;font-weight:600;">{email}</td></tr>
              <tr><td style="padding:6px 0;color:#475569;"><strong>Temporary Password:</strong></td><td style="padding:6px 0;color:#0f172a;font-weight:600;">{password}</td></tr>
            </table>
          </div>
          <div style="background:#fef3c7;padding:12px;border-radius:6px;border-left:3px solid #f59e0b;">
            <p style="margin:0;font-size:14px;color:#78350f;">Login with these credentials. Change password on first login.</p>
          </div>
        </div>`;
      await sendMail({ to: user.email, subject, html: renderTemplate(html, { name: user.name || 'Coordinator', coordinatorId: user.coordinatorId, email: user.email, password: defaultPassword }) });
    }

    // Log activity
    logActivity({
      userEmail: req.user.email,
      userRole: req.user.role,
      actionType: 'CREATE',
      targetType: 'COORDINATOR',
      targetId: user._id.toString(),
      description: `Created coordinator: ${coordinatorName} (${coordinatorEmail})`,
      metadata: { coordinatorId: coordinatorID },
      req
    });

    return res.status(201).json({ id: user._id, email: user.email, coordinatorID: user.coordinatorId, status: 'created' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

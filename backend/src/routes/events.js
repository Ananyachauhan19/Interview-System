import { Router } from 'express';
import multer from 'multer';
import { createEvent, listEvents, joinEvent, exportJoinedCsv, eventAnalytics, replaceEventTemplate, getTemplateUrl } from '../controllers/eventController.js';
import { supabase } from '../utils/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', requireAuth, listEvents);
router.post('/', requireAuth, requireAdmin, upload.single('template'), createEvent);
router.post('/:id/join', requireAuth, joinEvent);
router.post('/:id/template', requireAuth, requireAdmin, upload.single('template'), replaceEventTemplate);
router.get('/:id/participants.csv', requireAuth, requireAdmin, exportJoinedCsv);
router.get('/:id/analytics', requireAuth, requireAdmin, eventAnalytics);
router.get('/:id/template-url', requireAuth, getTemplateUrl);
router.get('/__supabase/health', requireAuth, requireAdmin, async (req, res) => {
	try {
		if (!supabase) return res.status(500).json({ ok: false, reason: 'not_configured' });
		const bucket = process.env.SUPABASE_BUCKET || 'templates';
		const { data, error } = await supabase.storage.from(bucket).list('', { limit: 1 });
		if (error) return res.status(500).json({ ok: false, reason: 'list_failed', error: error.message });
		res.json({ ok: true, bucket, sample: data?.length || 0 });
	} catch (e) {
		res.status(500).json({ ok: false, reason: 'exception', error: e?.message || String(e) });
	}
});
router.get('/__supabase/write-test', requireAuth, requireAdmin, async (req, res) => {
	try {
		if (!supabase) return res.status(500).json({ ok: false, reason: 'not_configured' });
		const bucket = process.env.SUPABASE_BUCKET || 'templates';
		const key = `__health/${Date.now()}_ping.txt`;
		const blob = new Blob([`ping ${new Date().toISOString()}`], { type: 'text/plain' });
		const up = await supabase.storage.from(bucket).upload(key, blob, { contentType: 'text/plain', upsert: false });
		if (up.error) return res.status(500).json({ ok: false, reason: 'upload_failed', error: up.error.message });
		// cleanup
		await supabase.storage.from(bucket).remove([key]);
		return res.json({ ok: true, bucket, key });
	} catch (e) {
		return res.status(500).json({ ok: false, reason: 'exception', error: e?.message || String(e) });
	}
});

export default router;

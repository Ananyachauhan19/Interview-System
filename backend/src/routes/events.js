

import { Router } from 'express';
import multer from 'multer';
import { createEvent, listEvents, joinEvent, exportJoinedCsv, eventAnalytics, replaceEventTemplate, getTemplateUrl, deleteEventTemplate, getEvent, createSpecialEvent, updateEventCapacity, updateEventJoinDisable } from '../controllers/eventController.js';
import { supabase } from '../utils/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.patch('/:id/join-disable', requireAuth, requireAdmin, updateEventJoinDisable);
router.patch('/:id/capacity', requireAuth, requireAdmin, updateEventCapacity);
const upload = multer({ storage: multer.memoryStorage() });
const multi = upload.fields([
	{ name: 'template', maxCount: 1 },
	{ name: 'csv', maxCount: 1 },
]);

router.get('/', requireAuth, listEvents);
router.post('/', requireAuth, requireAdmin, upload.single('template'), createEvent);
router.post('/special', requireAuth, requireAdmin, multi, createSpecialEvent);
router.get('/:id', requireAuth, requireAdmin, getEvent);
router.post('/:id/join', requireAuth, joinEvent);
router.post('/:id/template', requireAuth, requireAdmin, upload.single('template'), replaceEventTemplate);
router.get('/:id/participants.csv', requireAuth, requireAdmin, exportJoinedCsv);
router.get('/:id/analytics', requireAuth, requireAdmin, eventAnalytics);
router.get('/:id/template-url', requireAuth, getTemplateUrl);
router.delete('/:id/template', requireAuth, requireAdmin, deleteEventTemplate);
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

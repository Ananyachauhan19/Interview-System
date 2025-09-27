import { useEffect, useState, useCallback } from 'react';
import { api } from '../utils/api';
// eslint-disable-next-line
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, RefreshCw, GraduationCap, Download } from 'lucide-react';

export default function FeedbackReview() {
	const [feedback, setFeedback] = useState([]);
	const [events, setEvents] = useState([]);
	const [eventId, setEventId] = useState('');
	const [college, setCollege] = useState('');
	const [loading, setLoading] = useState(false);
	const [msg, setMsg] = useState('');

		const loadEvents = async () => {
			try { const ev = await api.listEvents(); setEvents(ev); } catch { /* ignore */ }
		};

		const load = useCallback(async () => {
		setLoading(true);
		try {
			const qs = new URLSearchParams();
			if (eventId) qs.set('eventId', eventId);
			if (college) qs.set('college', college.trim());
			const list = await api.listFeedback(qs.toString());
			setFeedback(list);
			setMsg(list.length ? '' : 'No feedback records');
		} catch (e) {
			setMsg(e.message);
		} finally {
			setLoading(false);
		}
		}, [eventId, college]);

		useEffect(() => { loadEvents(); }, []);
			useEffect(() => { load(); }, [load]);

	const applyFilters = (e) => { e.preventDefault(); load(); };
	const reset = () => { setEventId(''); setCollege(''); setTimeout(load, 0); };

	const downloadCsv = async () => {
	  try {
		const qs = new URLSearchParams();
		if (eventId) qs.set('eventId', eventId);
		if (college) qs.set('college', college.trim());
		const csv = await api.exportFilteredFeedbackCsv(qs.toString());
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url; a.download = 'feedback.csv'; a.click();
		URL.revokeObjectURL(url);
	  } catch (e) { setMsg(e.message); }
	};

		return (
			<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 flex flex-col pt-16">
				<div className="flex-1 w-full mx-auto px-4 sm:px-6 md:px-8 py-6">
					<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
					<h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3"><GraduationCap className="w-6 h-6 text-purple-600" /> Feedback Review</h2>
					<form onSubmit={applyFilters} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
						<div>
							<label className="block text-xs font-semibold text-gray-600 mb-1">Event</label>
							<select value={eventId} onChange={e => setEventId(e.target.value)} className="w-full border border-gray-200 bg-gray-50 rounded-xl p-2 text-sm focus:ring-2 focus:ring-blue-500">
								<option value="">All Events</option>
								{events.map(ev => <option key={ev._id} value={ev._id}>{ev.name}</option>)}
							</select>
						</div>
						<div>
							<label className="block text-xs font-semibold text-gray-600 mb-1">Interviewee College</label>
							<input value={college} onChange={e => setCollege(e.target.value)} placeholder="College name" className="w-full border border-gray-200 bg-gray-50 rounded-xl p-2 text-sm focus:ring-2 focus:ring-blue-500" />
						</div>
						<div className="flex items-end gap-2">
							<button type="submit" className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center justify-center gap-2 hover:from-blue-600 hover:to-indigo-600 transition"><Filter className="w-4 h-4" /> Apply</button>
							<button type="button" onClick={reset} className="bg-gray-100 text-gray-700 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-gray-200 transition">Reset</button>
						</div>
						<div className="flex items-end">
							<button type="button" onClick={load} disabled={loading} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-100 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Loading' : 'Reload'}</button>
						</div>
						<div className="flex items-end">
							<button type="button" onClick={downloadCsv} className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center justify-center gap-2 hover:from-green-600 hover:to-emerald-600 transition"><Download className="w-4 h-4" /> CSV</button>
						</div>
					</form>
					<AnimatePresence>
						{msg && (
							<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-gray-500 mb-4">{msg}</motion.div>
						)}
					</AnimatePresence>
					<div className="overflow-x-auto -mx-2">
						<table className="min-w-full text-sm">
							<thead>
								<tr className="text-left text-gray-600 border-b border-gray-200">
									<th className="py-2 px-2 font-semibold">Event</th>
									<th className="py-2 px-2 font-semibold">Interviewer</th>
									<th className="py-2 px-2 font-semibold">Interviewee</th>
									<th className="py-2 px-2 font-semibold">College</th>
									<th className="py-2 px-2 font-semibold">Marks</th>
									<th className="py-2 px-2 font-semibold">Comments</th>
									<th className="py-2 px-2 font-semibold">Submitted</th>
								</tr>
							</thead>
							<tbody>
								{feedback.map(f => (
									<tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50">
										<td className="py-2 px-2 whitespace-nowrap">{f.event}</td>
										<td className="py-2 px-2 whitespace-nowrap">{f.interviewer}</td>
										<td className="py-2 px-2 whitespace-nowrap">{f.interviewee}</td>
										<td className="py-2 px-2 whitespace-nowrap">{f.intervieweeCollege || '-'}</td>
										<td className="py-2 px-2">{f.marks}</td>
										<td className="py-2 px-2 max-w-xs overflow-hidden text-ellipsis">{f.comments}</td>
										<td className="py-2 px-2 whitespace-nowrap">{new Date(f.submittedAt).toLocaleString()}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
						</motion.div>
					</div>
				</motion.div>
	);
}

import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../utils/api';

export default function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [pairs, setPairs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [reloadingTemplateUrl, setReloadingTemplateUrl] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [ev, an, pr] = await Promise.all([
        api.getEvent(id),
        api.getEventAnalytics(id),
        api.listPairs(id),
      ]);
      setEvent(ev);
      setAnalytics(an);
      setPairs(pr);
    } catch (e) {
      setMsg(e.message);
    } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const handleGeneratePairs = async () => {
    try {
      await api.generatePairs(id);
      setMsg('Pairs generated');
      load();
    } catch (e) { setMsg(e.message); }
  };
  const handleExportCsv = async () => {
    try {
      const csv = await api.exportParticipantsCsv(id);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `participants_${id}.csv`; a.click(); URL.revokeObjectURL(url);
    } catch (e) { setMsg(e.message); }
  };
  const handleDeleteTemplate = async () => {
    if (!window.confirm('Delete template? This cannot be undone.')) return;
    try {
      await api.deleteEventTemplate(id);
      setMsg('Template deleted');
      load();
    } catch (e) { setMsg(e.message); }
  };
  const refreshSignedUrl = async () => {
    if (!event?.templateKey) return; // only for signed
    try {
      setReloadingTemplateUrl(true);
      const { templateUrl } = await api.getEventTemplateUrl(id);
      setEvent((prev) => ({ ...prev, templateUrl }));
    } catch (e) { setMsg(e.message); } finally { setReloadingTemplateUrl(false); }
  };
  const handleReplaceTemplate = async (file) => {
    try {
      const updated = await api.updateEventTemplate(id, file);
      setEvent(updated);
      setMsg('Template updated');
    } catch (e) { setMsg(e.message); }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!event) return <div className="p-6 text-red-600">Event not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-blue-700">{event.name}</h2>
          <p className="text-gray-600 max-w-xl whitespace-pre-line">{event.description}</p>
          <div className="text-sm text-gray-500 mt-2">Start: {event.startDate ? new Date(event.startDate).toLocaleString() : 'N/A'}<br/>End: {event.endDate ? new Date(event.endDate).toLocaleString() : 'N/A'}</div>
          <div className="mt-2 text-sm">Participants: {event.participantCount}</div>
          {analytics && (
            <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 grid grid-cols-2 gap-3 text-sm">
              <div><span className="font-semibold">Joined:</span> {analytics.joined}</div>
              <div><span className="font-semibold">Pairs:</span> {analytics.pairs}</div>
              <div><span className="font-semibold">Scheduled:</span> {analytics.scheduled}</div>
              <div><span className="font-semibold">Feedback:</span> {analytics.feedbackSubmissions}</div>
              <div className="col-span-2"><span className="font-semibold">Avg Score:</span> {analytics.averageScore}</div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 items-end">
          <Link to="/admin/event" className="text-blue-600 text-sm underline">← Back</Link>
          <button onClick={handleGeneratePairs} className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm">Generate Pairs</button>
          <button onClick={handleExportCsv} className="bg-gray-800 text-white px-4 py-2 rounded-xl text-sm">Export CSV</button>
          <label className="bg-white border px-3 py-2 rounded-xl text-sm cursor-pointer">
            <input type="file" className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) handleReplaceTemplate(f); e.target.value='';}} />
            Replace Template
          </label>
          {event.templateUrl && (
            <a href={event.templateUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-700 underline">View Template{event.templateName?`: ${event.templateName}`:''}</a>
          )}
          {!event.ended && event.templateUrl && (
            <div className="text-[10px] text-gray-500">Template deletable after event ends</div>
          )}
          {event.canDeleteTemplate && (
            <button onClick={handleDeleteTemplate} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm">Delete Template</button>
          )}
          {event.templateKey && import.meta.env.VITE_SUPABASE_PUBLIC !== 'true' && (
            <button disabled={reloadingTemplateUrl} onClick={refreshSignedUrl} className="text-xs text-purple-700 underline disabled:opacity-50">Refresh Signed URL</button>
          )}
        </div>
      </div>
      {msg && <div className="text-sm text-center text-gray-600">{msg}</div>}
      <div>
        <h3 className="text-xl font-semibold mb-2">Pairs</h3>
        {pairs.length === 0 && <div className="text-sm text-gray-500">No pairs yet.</div>}
        <div className="space-y-2 max-h-96 overflow-auto pr-2">
          {pairs.map(p => (
            <div key={p._id} className="p-3 rounded-xl bg-white shadow border flex flex-col gap-1 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold text-blue-700">{p.interviewer?.name || p.interviewer?.email}</span>
                <span className="text-gray-400">→</span>
                <span className="font-semibold text-pink-700">{p.interviewee?.name || p.interviewee?.email}</span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                <span>Status: {p.status || (p.scheduledAt ? 'scheduled' : 'pending')}</span>
                {p.scheduledAt && <span>Time: {new Date(p.scheduledAt).toLocaleString()}</span>}
                {p.meetingLink && <a href={p.meetingLink} className="text-blue-600 underline" target="_blank" rel="noreferrer">Meeting Link</a>}
                {p.rejectionCount > 0 && <span className="text-red-600">Rejections: {p.rejectionCount}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

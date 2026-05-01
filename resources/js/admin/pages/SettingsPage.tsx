import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import api from '@/api';

// --- Types ---

interface Settings {
    prefill_message: string;
    onboarding_video_url: string;
    agent_hide_after_hours: number;
    public_refresh_interval_seconds: number;
    show_offline_agents: boolean;
    warn_on_offline_click: boolean;
    shuffle_live_agents: boolean;
}

interface SettingsResponse {
    settings: Settings;
    embed_base_url: string;
}

const DEFAULT_SETTINGS: Settings = {
    prefill_message: 'Hi Kemerbet agent, I want to deposit',
    onboarding_video_url: '',
    agent_hide_after_hours: 12,
    public_refresh_interval_seconds: 60,
    show_offline_agents: true,
    warn_on_offline_click: true,
    shuffle_live_agents: true,
};

const YOUTUBE_URL_REGEX = /^$|^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w\-_]+/i;

// --- Toggle component (inline styles — no .toggle class in admin.css) ---

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
    return (
        <button
            type="button"
            onClick={() => !disabled && onChange(!value)}
            style={{
                width: 40,
                height: 22,
                borderRadius: 11,
                border: 'none',
                background: value ? 'var(--green)' : 'var(--bg-elev-2)',
                position: 'relative',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'background .2s',
                opacity: disabled ? 0.5 : 1,
            }}
        >
            <span style={{
                position: 'absolute',
                top: 2,
                left: value ? 20 : 2,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left .2s',
            }} />
        </button>
    );
}

function ToggleRow({ title, desc, value, onChange, disabled }: {
    title: string;
    desc: string;
    value: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{title}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
            </div>
            <Toggle value={value} onChange={onChange} disabled={disabled} />
        </div>
    );
}

// --- Security Tab ---

function SecurityTab() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [success, setSuccess] = useState(false);

    const canSubmit = currentPassword.length > 0 && newPassword.length > 0 && confirmPassword.length > 0 && !submitting;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setErrors({});
        setSuccess(false);

        try {
            await api.post('/api/admin/auth/change-password', {
                current_password: currentPassword,
                new_password: newPassword,
                new_password_confirmation: confirmPassword,
            });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setSuccess(true);
            setTimeout(() => setSuccess(false), 5000);
        } catch (err: unknown) {
            const resp = (err as { response?: { data?: { errors?: Record<string, string[]> } } }).response;
            if (resp?.data?.errors) {
                setErrors(resp.data.errors);
            } else {
                setErrors({ current_password: ['Something went wrong. Please try again.'] });
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="panel">
            <div className="panel-head">
                <div className="panel-title">Change Password</div>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="panel-body">
                    <div className="form-grid">
                        <div className="form-row">
                            <label className="form-label" htmlFor="current-password">Current Password</label>
                            <input
                                id="current-password"
                                type="password"
                                className={`form-input${errors.current_password ? ' error' : ''}`}
                                value={currentPassword}
                                onChange={(e) => { setCurrentPassword(e.target.value); setErrors({}); }}
                                autoComplete="current-password"
                            />
                            {errors.current_password && (
                                <div className="form-error">{errors.current_password[0]}</div>
                            )}
                        </div>
                        <div className="form-row">
                            <label className="form-label" htmlFor="new-password">New Password</label>
                            <input
                                id="new-password"
                                type="password"
                                className={`form-input${errors.new_password ? ' error' : ''}`}
                                value={newPassword}
                                onChange={(e) => { setNewPassword(e.target.value); setErrors({}); }}
                                autoComplete="new-password"
                            />
                            {errors.new_password && (
                                <div className="form-error">{errors.new_password[0]}</div>
                            )}
                            <div className="form-help">Minimum 8 characters.</div>
                        </div>
                        <div className="form-row">
                            <label className="form-label" htmlFor="confirm-password">Confirm New Password</label>
                            <input
                                id="confirm-password"
                                type="password"
                                className={`form-input${errors.new_password_confirmation ? ' error' : ''}`}
                                value={confirmPassword}
                                onChange={(e) => { setConfirmPassword(e.target.value); setErrors({}); }}
                                autoComplete="new-password"
                            />
                        </div>
                    </div>
                    {success && (
                        <div style={{
                            marginTop: 14,
                            padding: '10px 14px',
                            background: 'rgba(34,197,94,0.08)',
                            border: '1px solid rgba(34,197,94,0.25)',
                            borderRadius: 8,
                            fontSize: '.85rem',
                            color: 'var(--green)',
                        }}>
                            Password updated successfully.
                        </div>
                    )}
                </div>
                <div className="panel-foot">
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={!canSubmit}
                    >
                        {submitting ? <><Loader2 size={14} className="loader-spin" /> Updating&hellip;</> : 'Update Password'}
                    </button>
                </div>
            </form>
        </div>
    );
}

// --- Main Component ---

export default function SettingsPage() {
    const [savedSettings, setSavedSettings] = useState<Settings | null>(null);
    const [form, setForm] = useState<Settings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('general');
    const [embedBaseUrl, setEmbedBaseUrl] = useState<string>('');
    const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

    const fetchSettings = useCallback(() => {
        setLoading(true);
        setError(null);
        api.get('/api/admin/settings')
            .then((res) => {
                const data = res.data.data as SettingsResponse;
                setSavedSettings(data.settings);
                setForm(data.settings);
                setEmbedBaseUrl(data.embed_base_url);
            })
            .catch(() => setError('Failed to load settings'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    // Unsaved changes guard
    const isDirty = savedSettings !== null && JSON.stringify(form) !== JSON.stringify(savedSettings);

    useEffect(() => {
        if (!isDirty) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);

    function updateField<K extends keyof Settings>(key: K, value: Settings[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
        setSaveSuccess(false);
        setSaveError(null);
    }

    async function handleSave() {
        if (!savedSettings || !isDirty) return;
        setSaving(true);
        setSaveError(null);
        setSaveSuccess(false);

        const diff: Partial<Settings> = {};
        for (const key of Object.keys(form) as (keyof Settings)[]) {
            if (form[key] !== savedSettings[key]) {
                (diff as Record<string, unknown>)[key] = form[key];
            }
        }

        try {
            const res = await api.patch('/api/admin/settings', diff);
            const data = res.data.data as SettingsResponse;
            setSavedSettings(data.settings);
            setForm(data.settings);
            setEmbedBaseUrl(data.embed_base_url);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err: unknown) {
            const resp = (err as { response?: { data?: { message?: string } } }).response;
            setSaveError(resp?.data?.message ?? 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    }

    async function handleCopySnippet() {
        const snippet = `<div id="kemerbet-agents"></div>\n<script src="${embedBaseUrl}/embed/embed.js"></script>`;
        try {
            await navigator.clipboard.writeText(snippet);
            setCopyState('copied');
            setTimeout(() => setCopyState('idle'), 2000);
        } catch {
            // Older browsers / restricted environments
        }
    }

    function handleDiscard() {
        if (savedSettings) {
            setForm(savedSettings);
            setSaveError(null);
            setSaveSuccess(false);
        }
    }

    if (loading) {
        return (
            <div className="empty-state">
                <Loader2 size={28} className="loader-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="dash-error">
                <span>{error}</span>
                <button className="btn btn-sm btn-danger" onClick={fetchSettings}>Retry</button>
            </div>
        );
    }

    return (
        <>
            <div className="page-head">
                <div>
                    <h1>Settings</h1>
                    <div className="subtitle">Global configuration for the agent system</div>
                </div>
            </div>

            <div className="settings-tabs">
                {(['general', 'public', 'security', 'account'] as const).map((tab) => (
                    <button
                        key={tab}
                        className={`settings-tab${activeTab === tab ? ' active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'general' ? 'General' : tab === 'public' ? 'Public Page' : tab === 'security' ? 'Security' : 'Account'}
                    </button>
                ))}
            </div>

            {activeTab === 'general' ? (
                <>
                    {/* Telegram Pre-filled Message */}
                    <div className="panel">
                        <div className="panel-head">
                            <div className="panel-title">Telegram Pre-filled Message</div>
                        </div>
                        <div className="panel-body">
                            <div className="form-grid">
                                <div className="form-row">
                                    <label className="form-label">Message Sent When Player Clicks Deposit</label>
                                    <textarea
                                        className="form-textarea"
                                        rows={3}
                                        style={{ fontSize: '.9rem' }}
                                        value={form.prefill_message}
                                        onChange={(e) => updateField('prefill_message', e.target.value)}
                                        maxLength={200}
                                    />
                                    <div className="form-help">
                                        This message auto-fills in Telegram when a player clicks &ldquo;Deposit&rdquo; on any agent card.
                                        Players can edit before sending.
                                        <span style={{ float: 'right', color: form.prefill_message.length > 180 ? 'var(--gold)' : 'var(--text-dim)' }}>
                                            {form.prefill_message.length}/200
                                        </span>
                                    </div>
                                </div>
                                <div style={{ background: 'var(--bg-elev-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                                    <div style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>PREVIEW</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg)', borderRadius: 8, padding: 10, border: '1px solid var(--border)' }}>
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#229ED9,#1c7fad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.9rem', flexShrink: 0 }}>
                                            &#128232;
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '.78rem', fontWeight: 700 }}>@DOITFAST21 (Agent 7)</div>
                                            <div style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                                                {form.prefill_message || '(empty message)'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="panel-foot">
                            {isDirty && <button className="btn btn-secondary" onClick={handleDiscard} disabled={saving}>Reset</button>}
                            <button className="btn btn-primary" onClick={handleSave} disabled={!isDirty || saving}>
                                {saving ? <><Loader2 size={14} className="loader-spin" /> Saving&hellip;</> : 'Save'}
                            </button>
                        </div>
                    </div>

                    {/* Onboarding Video */}
                    <div className="panel">
                        <div className="panel-head">
                            <div className="panel-title">Onboarding Video</div>
                        </div>
                        <div className="panel-body">
                            <div className="form-grid">
                                <div style={{ fontSize: '.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                    A short tutorial video shown to new visitors at the top of the embed widget.
                                </div>
                                <div className="form-row">
                                    <label className="form-label" htmlFor="onboarding-video-url">Video URL (YouTube)</label>
                                    <input
                                        id="onboarding-video-url"
                                        type="text"
                                        className="form-input"
                                        placeholder="https://youtu.be/..."
                                        value={form.onboarding_video_url}
                                        onChange={(e) => updateField('onboarding_video_url', e.target.value)}
                                    />
                                    {form.onboarding_video_url === '' ? (
                                        <div className="form-help">Leave empty to disable the video.</div>
                                    ) : YOUTUBE_URL_REGEX.test(form.onboarding_video_url) ? (
                                        <div className="form-help" style={{ color: 'var(--green)' }}>Valid YouTube URL</div>
                                    ) : (
                                        <div className="form-help" style={{ color: 'var(--red)' }}>Must be a valid YouTube URL (youtube.com/watch, youtu.be, or youtube.com/embed format)</div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="panel-foot">
                            {isDirty && <button className="btn btn-secondary" onClick={handleDiscard} disabled={saving}>Reset</button>}
                            <button className="btn btn-primary" onClick={handleSave} disabled={!isDirty || saving}>
                                {saving ? <><Loader2 size={14} className="loader-spin" /> Saving&hellip;</> : 'Save'}
                            </button>
                        </div>
                    </div>

                    {/* Install Embed */}
                    <div className="panel">
                        <div className="panel-head">
                            <div className="panel-title">Install Embed</div>
                        </div>
                        <div className="panel-body">
                            <div style={{ marginBottom: 12, fontSize: '.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                Paste this snippet anywhere on the betting site where you want the agents block to appear. The widget loads live agents and updates automatically.
                            </div>

                            <div style={{
                                background: 'var(--bg-elev-2)',
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                padding: 14,
                                fontFamily: "'SF Mono', ui-monospace, monospace",
                                fontSize: '.82rem',
                                color: 'var(--text)',
                                whiteSpace: 'pre',
                                overflowX: 'auto',
                            }}>
                                {`<div id="kemerbet-agents"></div>\n<script src="${embedBaseUrl}/embed/embed.js"></script>`}
                            </div>

                            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={handleCopySnippet}
                                >
                                    {copyState === 'copied' ? '\u2713 Copied!' : '\uD83D\uDCCB Copy snippet'}
                                </button>
                                <a
                                    href="/embed-test.html"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary btn-sm"
                                    style={{ textDecoration: 'none' }}
                                >
                                    &#128269; Preview embed
                                </a>
                            </div>

                            <div style={{
                                marginTop: 14,
                                padding: '10px 14px',
                                background: 'rgba(59,130,246,0.06)',
                                border: '1px solid rgba(59,130,246,0.18)',
                                borderRadius: 8,
                                fontSize: '.78rem',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 8,
                            }}>
                                <span>&#8505;</span>
                                <span>The widget uses Shadow DOM, so its styling won&apos;t conflict with the host site&apos;s CSS. The current public refresh interval is <strong>{form.public_refresh_interval_seconds} seconds</strong> (configurable below).</span>
                            </div>
                        </div>
                    </div>

                    {/* Agent Behavior */}
                    <div className="panel">
                        <div className="panel-head">
                            <div className="panel-title">Agent Behavior</div>
                        </div>
                        <div className="panel-body">
                            <div className="form-grid">
                                <ToggleRow
                                    title="Show offline agents on public page"
                                    desc="Display recently-offline agents below the live ones (faded)"
                                    value={form.show_offline_agents}
                                    onChange={(v) => updateField('show_offline_agents', v)}
                                />
                                <div className="form-row">
                                    <label className="form-label">Hide offline agents after</label>
                                    <select
                                        className="form-select"
                                        style={{ maxWidth: 300 }}
                                        value={form.agent_hide_after_hours}
                                        onChange={(e) => updateField('agent_hide_after_hours', parseInt(e.target.value))}
                                    >
                                        <option value={6}>6 hours</option>
                                        <option value={12}>12 hours</option>
                                        <option value={24}>24 hours</option>
                                        <option value={72}>3 days</option>
                                        <option value={168}>Never hide (7 days)</option>
                                    </select>
                                    <div className="form-help">Agents not seen within this window won&apos;t show on the public page</div>
                                </div>
                                <div className="form-row">
                                    <label className="form-label">Public page refresh interval</label>
                                    <select
                                        className="form-select"
                                        style={{ maxWidth: 300 }}
                                        value={form.public_refresh_interval_seconds}
                                        onChange={(e) => updateField('public_refresh_interval_seconds', parseInt(e.target.value))}
                                    >
                                        <option value={30}>30 seconds</option>
                                        <option value={60}>1 minute (recommended)</option>
                                        <option value={120}>2 minutes</option>
                                        <option value={180}>3 minutes</option>
                                    </select>
                                    <div className="form-help">How often the public page polls for live status updates</div>
                                </div>
                                <ToggleRow
                                    title="Warn players before clicking offline agents"
                                    desc="Show a confirmation dialog when player clicks an offline agent"
                                    value={form.warn_on_offline_click}
                                    onChange={(v) => updateField('warn_on_offline_click', v)}
                                />
                                <ToggleRow
                                    title="Shuffle live agents on each refresh"
                                    desc="Randomize order so no agent gets unfair top position"
                                    value={form.shuffle_live_agents}
                                    onChange={(v) => updateField('shuffle_live_agents', v)}
                                />
                            </div>
                        </div>
                        <div className="panel-foot">
                            {isDirty && <button className="btn btn-secondary" onClick={handleDiscard} disabled={saving}>Discard</button>}
                            <button className="btn btn-primary" onClick={handleSave} disabled={!isDirty || saving}>
                                {saving ? <><Loader2 size={14} className="loader-spin" /> Saving&hellip;</> : 'Save Changes'}
                            </button>
                        </div>
                    </div>

                    {/* Notification Reminders (read-only) */}
                    <div className="panel">
                        <div className="panel-head">
                            <div className="panel-title">Agent Notification Reminders</div>
                        </div>
                        <div className="panel-body">
                            <div style={{
                                padding: '10px 14px',
                                background: 'rgba(245,197,24,0.08)',
                                border: '1px solid rgba(245,197,24,0.25)',
                                borderRadius: 8,
                                margin: '0 0 14px 0',
                                fontSize: '.82rem',
                                color: 'var(--gold)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                            }}>
                                <span>&#128679;</span>
                                <span><strong>Preview &mdash; not yet functional.</strong> These notification settings will become editable in Phase H. The values shown are placeholders.</span>
                            </div>
                            <div className="form-grid">
                                <ToggleRow
                                    title="Enable browser notifications globally"
                                    desc="Master switch for all agent reminder notifications"
                                    value={true}
                                    onChange={() => {}}
                                    disabled
                                />
                                <div style={{ border: '1px dashed var(--border)', borderRadius: 10, padding: 14, background: 'var(--bg-elev-2)' }}>
                                    <div style={{ fontSize: '.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
                                        REMINDER SCHEDULE
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '.85rem' }}>
                                        {[
                                            '10 minutes before live time ends',
                                            '5 minutes before live time ends',
                                            'When agent goes offline',
                                            '1 hour after going offline (come back reminder)',
                                        ].map((label) => (
                                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg)', borderRadius: 6 }}>
                                                <span>{label}</span>
                                                <Toggle value={true} onChange={() => {}} disabled />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="panel-foot">
                            <button className="btn btn-primary" disabled>Save</button>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="panel" style={{ borderColor: 'rgba(239,68,68,0.25)' }}>
                        <div className="panel-head" style={{ borderColor: 'rgba(239,68,68,0.15)' }}>
                            <div className="panel-title" style={{ color: 'var(--red)' }}>&#9888; Danger Zone</div>
                        </div>
                        <div className="panel-body">
                            <div style={{
                                padding: '10px 14px',
                                background: 'rgba(245,197,24,0.08)',
                                border: '1px solid rgba(245,197,24,0.25)',
                                borderRadius: 8,
                                margin: '0 0 14px 0',
                                fontSize: '.82rem',
                                color: 'var(--gold)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                            }}>
                                <span>&#128679;</span>
                                <span><strong>Not yet wired up.</strong> These actions will become available in Phase H.</span>
                            </div>
                            <div className="form-grid">
                                <div className="danger-row">
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '.9rem' }}>Force all agents offline</div>
                                        <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Sets every live agent&apos;s status to offline immediately.</div>
                                    </div>
                                    <button className="btn btn-danger" disabled>Force Offline All</button>
                                </div>
                                <div className="danger-row">
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '.9rem' }}>Regenerate all agent tokens</div>
                                        <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Invalidates every existing token.</div>
                                    </div>
                                    <button className="btn btn-danger" disabled>Regenerate All</button>
                                </div>
                                <div className="danger-row">
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '.9rem' }}>Clear all analytics data</div>
                                        <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Deletes all click and visit events. Cannot be undone.</div>
                                    </div>
                                    <button className="btn btn-danger" disabled>Clear Data</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {saveSuccess && (
                        <div className="toast show success" style={{ position: 'fixed', top: 20, right: 20, zIndex: 300 }}>
                            <span className="toast-icon">&#10003;</span>
                            <span>Settings saved</span>
                        </div>
                    )}
                    {saveError && (
                        <div className="dash-error" style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', maxWidth: 500, zIndex: 300 }}>
                            <span>{saveError}</span>
                            <button className="btn btn-sm btn-danger" onClick={() => setSaveError(null)}>Dismiss</button>
                        </div>
                    )}
                </>
            ) : activeTab === 'security' ? (
                <SecurityTab />
            ) : (
                <div className="panel">
                    <div className="empty-state">
                        <div className="icon">&#9881;</div>
                        <h3>
                            {activeTab === 'public' ? 'Public Page' : 'Account'} Settings
                        </h3>
                        <p>
                            {activeTab === 'public' && 'This section will let you customize the public agent listing \u2014 header text, branding, layout, and visibility rules. Available in Phase H.'}
                            {activeTab === 'account' && 'This section will manage your admin profile \u2014 name, email, notification preferences. Available in Phase H.'}
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}

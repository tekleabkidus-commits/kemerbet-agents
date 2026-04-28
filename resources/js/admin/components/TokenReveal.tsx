import { Copy, Check, Send } from 'lucide-react';

interface TokenRevealProps {
    tokenUrl: string;
    telegramUsername: string;
    onCopy: () => void;
    copied: boolean;
    onDismiss: () => void;
    warning?: string;
}

export default function TokenReveal({
    tokenUrl,
    telegramUsername,
    onCopy,
    copied,
    onDismiss,
    warning,
}: TokenRevealProps) {
    const telegramLink = `https://t.me/${telegramUsername}?text=${encodeURIComponent(tokenUrl)}`;

    return (
        <div className="token-reveal">
            <div className="token-reveal-header">New token generated</div>
            <div className="token-reveal-sub">
                Copy and send this link to the agent. It won&rsquo;t be shown again.
            </div>
            <div className="token-box">{tokenUrl}</div>
            <div className="token-reveal-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={onCopy}>
                    {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy link</>}
                </button>
                <a
                    href={telegramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                >
                    <Send size={12} /> Send via Telegram
                </a>
            </div>
            <div className="token-reveal-dismiss">
                <button type="button" className="btn btn-secondary btn-sm" onClick={onDismiss}>
                    Dismiss
                </button>
            </div>
            {warning && (
                <div className="token-warning">
                    <strong>Important:</strong> {warning}
                </div>
            )}
        </div>
    );
}

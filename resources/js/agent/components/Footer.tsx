interface Props {
  tokenSuffix: string;
}

export default function Footer({ tokenSuffix }: Props) {
  return (
    <div className="footer">
      Need help? <a href="#">Contact admin</a>
      <br />
      <span style={{ opacity: 0.6, fontSize: '.7rem', marginTop: 4, display: 'inline-block' }}>
        Token: ••••••••{tokenSuffix}
      </span>
    </div>
  );
}

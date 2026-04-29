interface Props {
  displayNumber: number;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export default function Greeting({ displayNumber }: Props) {
  return (
    <div className="greeting">
      <div className="hi">ሰላም 👋</div>
      <h1>
        Hi, you are <span className="num">Agent #{pad(displayNumber)}</span>
      </h1>
    </div>
  );
}

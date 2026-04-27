interface StubPageProps {
    title: string;
}

export default function StubPage({ title }: StubPageProps) {
    return (
        <>
            <div className="page-head">
                <div><h1>{title}</h1></div>
            </div>
            <div className="panel">
                <div className="panel-body panel-empty">
                    <h2 className="panel-title">Coming in Phase B</h2>
                    <p className="panel-text">This page will be built once the data layer is wired up.</p>
                </div>
            </div>
        </>
    );
}

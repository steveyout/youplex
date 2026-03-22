export default function TvLayout({ children }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#050505',
        color: '#fff',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

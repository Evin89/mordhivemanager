export default function Portrait({ large = false }: { large?: boolean }) {
 return <div className={`portrait ${large ? 'portrait-large' : ''}`} aria-hidden="true"><div className="portrait-placeholder" /><img src="/img/portrait-frame.png" alt="" /></div>;
}

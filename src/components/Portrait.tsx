export default function Portrait({ src, alt = '', large = false }: { src?: string | null; alt?: string; large?: boolean }) {
  return <div className={`portrait ${large ? 'portrait-large' : ''}`}>
    {src ? <div className="portrait-photo"><img src={src} alt={alt} loading="lazy" decoding="async" /></div> : <div className="portrait-placeholder" aria-hidden="true" />}
    <img src="/img/portrait-frame.png" alt="" aria-hidden="true" />
  </div>;
}

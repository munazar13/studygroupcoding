export default function PixelButton({ children, variant = 'primary', className = '', ...props }) {
  return (
    <button className={`pixel-button ${variant} ${className}`.trim()} type="button" {...props}>
      {children}
    </button>
  );
}

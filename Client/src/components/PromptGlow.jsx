// PromptGlow: soft blue "light rays" glow wrapper for chat prompt inputs
const PromptGlow = ({ children, active = false, rounded = "2xl", className = "" }) => (
  <div className={`prompt-glow prompt-glow--${rounded} ${active ? "prompt-glow--active" : ""} ${className}`}>
    <span className="prompt-glow__halo" aria-hidden="true" />
    <span className="prompt-glow__rays" aria-hidden="true" />
    <div className="prompt-glow__content">{children}</div>
  </div>
);

export default PromptGlow;

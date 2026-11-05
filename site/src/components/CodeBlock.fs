(<extruderInitialization>)
  import { highlight } from "../highlight.ts"

  M98 code: string
  M98 file: string = ""
  M98 lang: string = "fs"

  M105 tokens = highlight(code)
(</extruderInitialization>)

(<extrusion>)
  <figure>
    (<if> file )
      <figcaption><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="file">{file}</span><span class="lang">{lang}</span></figcaption>
    (</if>)
    <pre><code>
      (<each> tok of tokens )
        <span class={[tok.k && "tok-" + tok.k]}>{tok.t}</span>
      (</each>)
    </code></pre>
  </figure>
(</extrusion>)

(<filament>)
  figure {
    margin: 0;
    min-width: 0;
    background: var(--surface);
    border: 1px solid var(--hairline);
  }
  figcaption {
    display: flex;
    align-items: center;
    gap: 14px;
    height: 38px;
    padding: 0 14px;
    border-bottom: 1px solid var(--hairline);
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.04em;
    color: var(--muted);
  }
  .dots {
    display: flex;
    gap: 6px;
  }
  i {
    width: 8px;
    height: 8px;
    background: var(--hairline-strong);
  }
  .file {
    color: var(--fg-2);
  }
  .lang {
    margin-left: auto;
    text-transform: uppercase;
    color: var(--faint);
  }
  pre {
    margin: 0;
    padding: 18px 20px;
    overflow-x: auto;
    font-size: 13px;
    line-height: 1.7;
    color: var(--fg-2);
    tab-size: 2;
  }
  code {
    font: inherit;
  }
(</filament>)

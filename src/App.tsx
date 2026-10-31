import { useMemo, useState } from 'react';
import { Shell } from './shell/Shell';
import { type ToolId } from './tools/registry';
import { Tuner } from './tuner/Tuner';
import { readPreview } from './tuner/preview';

export function App() {
  const preview = useMemo(() => readPreview(window.location.search), []);
  const [tool, setTool] = useState<ToolId>('tuner');

  return (
    <Shell active={tool} onSelect={setTool}>
      {tool === 'tuner' ? <Tuner preview={preview} /> : null}
    </Shell>
  );
}

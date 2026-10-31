import type { ToolId } from '../tools/registry';
import { tools } from '../tools/registry';
import { InkMark } from './InkMark';

type Props = {
  active: ToolId;
  onSelect: (id: ToolId) => void;
};

export function TabBar({ active, onSelect }: Props) {
  return (
    <nav className="tabs" aria-label="Tools">
      {tools.map((tool) => {
        const current = tool.id === active;
        return (
          <button
            key={tool.id}
            type="button"
            className={current ? 'tab is-current' : 'tab'}
            disabled={!tool.enabled}
            aria-current={current ? 'page' : undefined}
            aria-label={tool.enabled ? tool.label : `${tool.label}, coming soon`}
            onClick={() => {
              if (tool.enabled) onSelect(tool.id);
            }}
          >
            <span>{tool.label}</span>
            {tool.enabled ? <InkMark /> : <span className="soon">soon</span>}
          </button>
        );
      })}
    </nav>
  );
}

import type { ReactNode } from 'react';
import type { ToolId } from '../tools/registry';
import { Grain } from './Grain';
import { TabBar } from './TabBar';

type Props = {
  active: ToolId;
  onSelect: (id: ToolId) => void;
  children: ReactNode;
};

export function Shell({ active, onSelect, children }: Props) {
  return (
    <div className="app">
      <Grain />
      <header className="mast">
        <p className="brand">campfire</p>
      </header>
      <main className="stage">{children}</main>
      <TabBar active={active} onSelect={onSelect} />
    </div>
  );
}

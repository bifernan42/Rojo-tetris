type MenuButtonsProps = {
  primary?: { label: string; disabled: boolean; onClick: () => void } | undefined;
  onMenu: () => void;
};

export default function MenuButtons({ primary, onMenu }: MenuButtonsProps) {
  return (
    <div className="menu-buttons">
      {primary && <button className="gc-button gc-button--primary" disabled={primary.disabled} onClick={primary.onClick}>{primary.label}</button>}
      <button className="gc-button" onClick={onMenu}>Menu</button>
    </div>
  );
}

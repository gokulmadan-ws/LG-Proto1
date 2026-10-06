// The overlays that other owners build, mounted once, always rendered (each returns null while closed).
// Props and contracts are documented in the header of each file. Opened through useUI() (lib/ui-context.jsx).
import { useUI, useUIState } from '../lib/ui-context.jsx';
import FlagDrawer from './FlagDrawer.jsx';
import AboutDialog from './overlays/AboutDialog.jsx';
import FeedbackDialog from './overlays/FeedbackDialog.jsx';
import SettingsDrawer from './overlays/SettingsDrawer.jsx';
import DemoGuideDrawer from './overlays/DemoGuideDrawer.jsx';
import MenuPopover from './overlays/MenuPopover.jsx';

export function Overlays() {
  const ui = useUI();
  const s = useUIState();
  return (
    <>
      <FlagDrawer />
      <AboutDialog open={s.about} onClose={ui.closeAbout} />
      <FeedbackDialog open={s.feedback} onClose={ui.closeFeedback} />
      <SettingsDrawer open={s.settings} onClose={ui.closeSettings} />
      <DemoGuideDrawer open={s.demoGuide} onClose={ui.closeDemoGuide} />
      <MenuPopover open={s.menu.open} anchor={s.menu.anchor} onClose={ui.closeMenu} />
    </>
  );
}

export default Overlays;

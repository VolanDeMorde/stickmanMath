export const migrationTasks = [
  'Create React shell and keep legacy game playable.',
  'Split layout into React components: header, panel, footer, touch controls.',
  'Wrap game canvas lifecycle in a React GameCanvas component.',
  'Move HUD updates from direct DOM writes into React state/store.',
  'Add responsive drawer behavior for tablet/phone side panel.',
  'Keep pointer/touch controls unified across laptop, TV touch, and mobile.',
  'Add PWA manifest and install prompt for mobile testing.',
  'Set up GitHub Pages build/deploy for the React app.',
  'Run regression test matrix: desktop keyboard, desktop touch, tablet, phone.'
] as const

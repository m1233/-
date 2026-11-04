import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// Arabic fonts bundled locally (remotion-markup/local-fonts.md + arabic-text.md).
// Cairo and Reem Kufi are SIL Open Font License fonts, see public/fonts/OFL-*.txt.
const cairoReady = loadFont({family: 'Cairo', url: staticFile('fonts/Cairo-Variable.ttf'), weight: '200 1000'});
const kufiReady = loadFont({family: 'Reem Kufi', url: staticFile('fonts/ReemKufi-Variable.ttf'), weight: '400 700'});

export const cairo = {fontFamily: 'Cairo', waitUntilDone: () => cairoReady};
export const reemKufi = {fontFamily: 'Reem Kufi', waitUntilDone: () => kufiReady};

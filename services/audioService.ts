
import * as Tone from 'tone';

const synth = new Tone.PolySynth().toDestination();

export const playCorrectSound = () => {
  synth.triggerAttackRelease(["C4", "E4", "G4"], "8n");
};

export const playWrongSound = () => {
  synth.triggerAttackRelease(["C3", "Eb3"], "4n");
};

export const playClickSound = () => {
  synth.triggerAttackRelease("G4", "16n");
};

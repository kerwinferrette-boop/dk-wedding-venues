/**
 * Motif registry. `kind` on a theme recipe selects one of these; every motif
 * accepts the same props so the renderers never special-case a shape.
 */
import React from 'react'
import Botanical from './Botanical'
import Wave from './Wave'
import Arch from './Arch'
import Deco from './Deco'
import Linear from './Linear'
import Scatter from './Scatter'

export const MOTIF_COMPONENTS = { botanical: Botanical, wave: Wave, arch: Arch, deco: Deco, linear: Linear, scatter: Scatter }

/** Renders nothing for kind 'none' or an unknown kind. */
export default function Motif({ kind, ...props }) {
  const C = MOTIF_COMPONENTS[kind]
  return C ? <C {...props} /> : null
}

/** Inputs que retienen el foco pero no escriben caracteres. */
const NON_TEXT_INPUT_TYPES = new Set([
  'range',
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'color',
  'file',
  'image',
])

/** Lo único que un campo numérico llega a escribir. */
const NUMERIC_CHARS = /^[0-9.,eE+-]$/

/** Teclas que un slider consume para moverse. */
const RANGE_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
])

/**
 * Si el elemento con foco se va a quedar con esta tecla, y por lo tanto el atajo global tiene
 * que dejarla pasar.
 *
 * Antes alcanzaba con que hubiera *cualquier* input enfocado para matar todos los atajos, así
 * que tocar el slider de altura del piso o el checkbox de alineación dejaba P, T, F y 1-9 sin
 * efecto hasta que hicieras click en otro lado — un slider retiene el foco pero no escribe nada.
 * Acá sólo bloquea el campo que de verdad se queda con el caracter: un campo numérico bloquea
 * los dígitos (que son atajos de modo) pero deja pasar la P.
 */
export function keyGoesToField(el: EventTarget | null, key: string): boolean {
  if (!(el instanceof HTMLElement)) return false
  if (el.isContentEditable) return true
  const tag = el.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag !== 'INPUT') return false
  const type = (el as HTMLInputElement).type
  if (type === 'number') return NUMERIC_CHARS.test(key)
  if (type === 'range') return RANGE_KEYS.has(key)
  return !NON_TEXT_INPUT_TYPES.has(type)
}

import Convert from 'ansi-to-html'

export const createAnsiConverter = () =>
  new Convert({
    fg: 'currentColor',
    bg: 'transparent',
    newline: true,
    escapeXML: true,
    stream: false,
  })

export const sanitizeControlSequences = (value: string): string =>
  value
    // Strip OSC sequences (Operating System Command)
    .replace(/\u001B\][^\u0007]*\u0007/g, '')
    // Strip DCS (Device Control String) sequences: ESC P ... ESC \
    .replace(/\u001BP.*?\u001B\\?/gs, '')
    // Strip SOS/PM/APC sequences terminated by BEL
    .replace(/\u001B[\^\_].*?\u0007/g, '')
    // Remove CSI sequences that are not SGR (final byte not m)
    .replace(/\u001B\[[0-9;?]*[A-Za-z]/g, (seq) => (seq.endsWith('m') ? seq : ''))
    // Remove stray carriage returns without newline (cursor reposition artifacts)
    .replace(/\r(?!\n)/g, '')

export const stripAnsi = (value: string): string =>
  value.replace(/\u001B\[[0-9;]*[A-Za-z]/g, '')

export const renderFullOutput = (raw: string): string => {
  const cleaned = sanitizeControlSequences(raw)

  if (!cleaned) {
    return ''
  }

  try {
    const converter = createAnsiConverter()
    return converter.toHtml(cleaned)
  } catch (error) {
    console.error('Error converting ANSI output to HTML:', error)
    return cleaned
  }
}
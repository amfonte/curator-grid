/** Focus a hidden input synchronously inside a user tap/click handler so iOS/Android
 *  open the software keyboard. Call before async state updates / mount animations. */
export function primeMobileKeyboard(input: HTMLInputElement | null | undefined) {
  if (!input) return
  input.focus({ preventScroll: true })
}

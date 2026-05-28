/** Span 생성 */
export function createSpan(id, className, textContent) {
    const span = document.createElement('span');
    span.id = id;
    span.className = className;
    span.textContent = textContent;

    return span;
}

/** Button 생성 */
export function createButton(id, className, textContent) {
    const button = document.createElement('button');
    button.id = id;
    button.className = className;
    button.textContent = textContent;

    return button;
}

/** Icon 생성 */
export function createIcon(id, className) {
    const icon = document.createElement('i');
    icon.id = id;
    icon.className = className;

    return icon;
}
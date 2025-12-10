import * as vscode from 'vscode';

/**
 * Checks if the given document has any error-level diagnostics
 * @param document The document to check for errors
 * @returns true if there are errors, false otherwise
 */
export function hasErrors(document: vscode.TextDocument): boolean {
    const diagnostics = vscode.languages.getDiagnostics(document.uri);
    return diagnostics.some(diagnostic => diagnostic.severity === vscode.DiagnosticSeverity.Error);
}

/**
 * Shows an error message to the user if the document has errors
 * @param document The document to check for errors
 * @returns true if there are errors (and message was shown), false otherwise
 */
export function checkAndShowErrors(document: vscode.TextDocument): boolean {
    if (hasErrors(document)) {
        vscode.window.showErrorMessage('Cannot run or debug: The solution file has errors. Please fix them first.');
        return true;
    }
    return false;
}

import 'package:flutter/material.dart';

/// WizardFlow — Shared multi-step wizard widget.
///
/// Mirrors the web `WizardFlow` component for consistent step-based UX
/// across Transfer, Deposit, and future multi-step flows.
///
/// Usage:
///   WizardFlow(
///     steps: ['From', 'To', 'Amount', 'Done'],
///     currentStep: 2,
///     child: StepTwoContent(),
///   )
class WizardFlow extends StatelessWidget {
  /// Step labels (e.g. ["From", "To", "Amount", "Done"])
  final List<String> steps;

  /// 1-indexed current step number
  final int currentStep;

  /// The active step content
  final Widget child;

  const WizardFlow({
    super.key,
    required this.steps,
    required this.currentStep,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primary = theme.colorScheme.primary;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Step indicator
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: List.generate(steps.length * 2 - 1, (i) {
              if (i.isOdd) {
                // Connector line between steps
                return Expanded(
                  child: Container(
                    height: 2,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    color: currentStep > (i ~/ 2 + 1)
                        ? primary
                        : theme.colorScheme.surfaceContainerHighest,
                  ),
                );
              }

              final stepIndex = i ~/ 2;
              final stepNum = stepIndex + 1;
              final isComplete = currentStep > stepNum;
              final isCurrent = currentStep == stepNum;

              return Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Semantics(
                    label: 'Step $stepNum of ${steps.length}: ${steps[stepIndex]}${isComplete ? ", completed" : isCurrent ? ", current" : ""}',
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isComplete || isCurrent
                            ? primary
                            : theme.colorScheme.surfaceContainerHighest,
                      ),
                      child: Center(
                        child: isComplete
                            ? const Icon(Icons.check, size: 16, color: Colors.white)
                            : Text(
                                '$stepNum',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: isCurrent
                                      ? Colors.white
                                      : theme.colorScheme.onSurfaceVariant,
                                ),
                              ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    steps[stepIndex],
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: isCurrent ? FontWeight.w600 : FontWeight.w400,
                      color: isCurrent
                          ? theme.colorScheme.onSurface
                          : theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              );
            }),
          ),
        ),
        const SizedBox(height: 8),
        // Step content
        Expanded(child: child),
      ],
    );
  }
}

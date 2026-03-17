import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Masked input field for sensitive data — account numbers, SSN, etc.
/// Shows dots with last N characters visible. Mirrors web masking behavior.
class SecureField extends StatefulWidget {
  final TextEditingController controller;
  final String labelText;
  final String? hintText;
  final int visibleChars;
  final TextInputType keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final String? Function(String?)? validator;
  final bool enabled;

  const SecureField({
    super.key,
    required this.controller,
    required this.labelText,
    this.hintText,
    this.visibleChars = 4,
    this.keyboardType = TextInputType.number,
    this.inputFormatters,
    this.validator,
    this.enabled = true,
  });

  @override
  State<SecureField> createState() => _SecureFieldState();
}

class _SecureFieldState extends State<SecureField> {
  bool _obscured = true;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: widget.controller,
      obscureText: _obscured,
      keyboardType: widget.keyboardType,
      inputFormatters: widget.inputFormatters,
      validator: widget.validator,
      enabled: widget.enabled,
      decoration: InputDecoration(
        labelText: widget.labelText,
        hintText: widget.hintText,
        suffixIcon: IconButton(
          icon: Icon(
            _obscured ? Icons.visibility_off : Icons.visibility,
            size: 20,
          ),
          onPressed: () => setState(() => _obscured = !_obscured),
        ),
      ),
    );
  }
}

/// Read-only masked display for sensitive values (e.g., "****4521").
class MaskedValue extends StatefulWidget {
  final String maskedValue;
  final String? fullValue;
  final TextStyle? style;

  const MaskedValue({
    super.key,
    required this.maskedValue,
    this.fullValue,
    this.style,
  });

  @override
  State<MaskedValue> createState() => _MaskedValueState();
}

class _MaskedValueState extends State<MaskedValue> {
  bool _revealed = false;

  @override
  Widget build(BuildContext context) {
    final display = (_revealed && widget.fullValue != null)
        ? widget.fullValue!
        : widget.maskedValue;

    return GestureDetector(
      onTap: widget.fullValue != null
          ? () => setState(() => _revealed = !_revealed)
          : null,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(display, style: widget.style),
          if (widget.fullValue != null) ...[
            const SizedBox(width: 4),
            Icon(
              _revealed ? Icons.visibility_off : Icons.visibility,
              size: 14,
              color: Colors.grey,
            ),
          ],
        ],
      ),
    );
  }
}

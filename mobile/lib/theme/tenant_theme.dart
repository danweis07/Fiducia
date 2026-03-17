import 'package:flutter/material.dart';
import 'design_tokens.dart';

/// Tenant-aware theming — allows the institution's brand color to override
/// the default primary, while keeping all other design tokens consistent.
///
/// Wraps the app and provides tenant branding via InheritedWidget.
///
/// Usage:
///   TenantThemeProvider(
///     primaryColor: Color(0xFF1B5E20), // from capabilities endpoint
///     child: MaterialApp(...),
///   )
class TenantThemeProvider extends InheritedWidget {
  final Color primaryColor;
  final Color? accentColor;
  final String? logoUrl;

  const TenantThemeProvider({
    super.key,
    required this.primaryColor,
    this.accentColor,
    this.logoUrl,
    required super.child,
  });

  static TenantThemeProvider? of(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<TenantThemeProvider>();
  }

  /// Resolve the primary color — tenant override or default.
  static Color resolvePrimary(BuildContext context) {
    return TenantThemeProvider.of(context)?.primaryColor ?? DesignTokens.primary;
  }

  @override
  bool updateShouldNotify(TenantThemeProvider oldWidget) {
    return primaryColor != oldWidget.primaryColor ||
        accentColor != oldWidget.accentColor ||
        logoUrl != oldWidget.logoUrl;
  }
}

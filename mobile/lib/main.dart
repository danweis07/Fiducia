import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'theme/app_theme.dart';
import 'router.dart';
import 'services/gateway_client.dart';
import 'services/backend_provider.dart';
import 'services/supabase_provider.dart';
import 'services/rest_provider.dart';
import 'services/service_providers.dart';
import 'services/messaging/messaging_registry.dart';
import 'services/push_token_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Lock to portrait on phones
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Check for demo mode — skip backend init if env vars are missing
  const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  final isDemo = supabaseUrl.isEmpty || supabaseAnonKey.isEmpty;
  setDemoMode(isDemo);

  // Determine which backend provider to use.
  // Set BACKEND_PROVIDER=rest at compile time to use the REST provider.
  const backendProviderEnv = String.fromEnvironment('BACKEND_PROVIDER');

  BackendProvider? provider;

  if (!isDemo) {
    if (backendProviderEnv == 'rest') {
      // REST provider — requires REST_BASE_URL at compile time.
      const restBaseUrl = String.fromEnvironment('REST_BASE_URL');
      provider = RestProvider(baseUrl: restBaseUrl);
    } else {
      // Default: Supabase provider
      await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);
      provider = SupabaseProvider();
    }

    // Wire the provider into the gateway client
    GatewayClient.instance.setProvider(provider);
  }

  // Initialize Firebase for push notifications (needed by Braze/Airship too)
  // Firebase config files (google-services.json / GoogleService-Info.plist) are
  // environment-specific. If absent, Firebase init fails gracefully.
  bool firebaseAvailable = false;
  try {
    // Firebase.initializeApp() requires firebase_options.dart which is generated
    // via `flutterfire configure`. Skip if not available.
    firebaseAvailable = false; // Set to true when firebase_options.dart exists
  } catch (_) {
    debugPrint('[Firebase] Not initialized — config files not present');
  }

  // Create messaging provider based on compile-time MESSAGING_PROVIDER env var
  final messagingProvider = MessagingRegistry.create();

  // Initialize service providers (analytics, error tracking, messaging).
  ServiceProviders.instance.init(
    messagingProvider: messagingProvider,
  );

  // Start push token registration for Firebase-only mode (Braze/Airship handle tokens internally)
  if (firebaseAvailable && !isDemo && messagingProvider.name == 'firebase') {
    await PushTokenService.instance.initialize();
  }

  runApp(DigitalBankingApp(demoMode: isDemo));
}

class DigitalBankingApp extends StatelessWidget {
  final bool demoMode;

  const DigitalBankingApp({super.key, this.demoMode = false});

  @override
  Widget build(BuildContext context) {
    final router = buildRouter(demoMode: demoMode);

    return MaterialApp.router(
      title: 'Digital Banking',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.system,
      routerConfig: router,
    );
  }
}

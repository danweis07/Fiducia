import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';

/// Handles location permissions and position retrieval.
class LocationService {
  /// Request location permission and return the current position.
  /// Returns null if permission is denied.
  static Future<Position?> getCurrentPosition() async {
    final status = await Permission.locationWhenInUse.request();

    if (status.isDenied || status.isPermanentlyDenied) {
      return null;
    }

    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return null;
    }

    return Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
  }

  /// Check if location permission is already granted.
  static Future<bool> hasPermission() async {
    final status = await Permission.locationWhenInUse.status;
    return status.isGranted;
  }

  /// Open app settings so user can manually enable location.
  static Future<void> openSettings() async {
    await openAppSettings();
  }

  /// Calculate distance in miles between two coordinates.
  static double distanceMiles(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    final meters = Geolocator.distanceBetween(lat1, lon1, lat2, lon2);
    return meters / 1609.344;
  }
}

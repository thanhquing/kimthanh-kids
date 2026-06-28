const isDev = process.env.APP_VARIANT === "development";

const config = {
  name: isDev ? "KimThanh Kids Dev" : "KimThanh Kids",
  slug: "kids-mobile-native",
  owner: process.env.EXPO_OWNER,
  scheme: "kimthanhkids",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#fff8f3"
  },
  updates: {
    enabled: !isDev,
    fallbackToCacheTimeout: 0,
    url: process.env.EXPO_UPDATES_URL
  },
  runtimeVersion: {
    policy: "appVersion"
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    bundleIdentifier: "vn.kimthanhkids.app",
    buildNumber: "1",
    supportsTablet: false,
    infoPlist: {
      NSCameraUsageDescription: "KimThanh Kids cần camera để phụ huynh và giáo viên tải ảnh hoạt động, báo cáo hoặc hồ sơ học sinh khi nhà trường cho phép.",
      NSPhotoLibraryUsageDescription: "KimThanh Kids cần truy cập thư viện ảnh để chọn ảnh hoạt động, báo cáo hoặc hồ sơ học sinh khi nhà trường cho phép.",
      NSPhotoLibraryAddUsageDescription: "KimThanh Kids có thể lưu ảnh hoặc tài liệu do nhà trường cung cấp vào thư viện ảnh khi người dùng yêu cầu.",
      ITSAppUsesNonExemptEncryption: false,
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: isDev
      }
    },
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
          NSPrivacyAccessedAPITypeReasons: ["CA92.1"]
        }
      ],
      NSPrivacyCollectedDataTypes: [
        {
          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeName",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"]
        },
        {
          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypePhoneNumber",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"]
        },
        {
          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypePhotosorVideos",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"]
        }
      ]
    }
  },
  android: {
    package: "vn.kimthanhkids.app",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#fff8f3"
    },
    permissions: ["CAMERA", "READ_MEDIA_IMAGES"],
    blockedPermissions: ["POST_NOTIFICATIONS"]
  },
  web: {
    bundler: "metro",
    favicon: "./assets/favicon.png"
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-font",
    "expo-splash-screen",
    [
      "expo-build-properties",
      {
        ios: {
          newArchEnabled: true,
          useFrameworks: "static"
        },
        android: {
          newArchEnabled: true
        }
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api",
    eas: {
      projectId: process.env.EXPO_PROJECT_ID ?? "00000000-0000-0000-0000-000000000000"
    }
  }
};

export default config;

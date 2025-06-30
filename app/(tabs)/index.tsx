import { Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';

const allowedDomains = [
  'macrossover.com',
  'app.macrossover.com'
];

function isAllowedUrl(url: string) {
  try {
    const { hostname } = new URL(url);
    return allowedDomains.some(domain => hostname.endsWith(domain));
  } catch {
    return false;
  }
}

const injectedJS = `
  (function() {
    window.open = function(url) {
      window.location = url;
    };
  })();
`;

export default function HomeScreen() {
  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={{ uri: 'https://macrossover.com' }}
        style={{ flex: 1 }}
        originWhitelist={['*']}
        setSupportMultipleWindows={false}
        injectedJavaScript={injectedJS}
        onShouldStartLoadWithRequest={request => {
          return isAllowedUrl(request.url);
        }}
        onNavigationStateChange={navState => {
          if (
            Platform.OS === 'android' &&
            !isAllowedUrl(navState.url)
          ) {
            // Prevent navigation to external domains on Android
            return false;
          }
        }}
      />
    </View>
  );
}

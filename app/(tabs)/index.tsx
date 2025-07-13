import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
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

export default function HomeScreen() {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    // Get the push token from AsyncStorage
    AsyncStorage.getItem('expoPushToken')
      .then(token => {
        if (token) {
          setPushToken(token);
          console.log('Retrieved push token for WebView:', token);
          
          // Inject the token into the WebView if it's already loaded
          if (webViewRef.current) {
            const injectTokenScript = `
              (function() {
                localStorage.setItem('expoPushToken', '${token}');
                console.log('Push token injected into web app:', '${token}');
              })();
            `;
            webViewRef.current.injectJavaScript(injectTokenScript);
          }
        }
      })
      .catch(error => {
        console.error('Error retrieving push token:', error);
      });
  }, []);

  // Initial injected JavaScript that sets up communication
  const injectedJS = `
    (function() {
      // Override window.open
      window.open = function(url) {
        window.location = url;
      };
      
      // Listen for messages from React Native
      window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'SET_PUSH_TOKEN') {
          localStorage.setItem('expoPushToken', event.data.token);
          console.log('Push token received and stored:', event.data.token);
        }
      });
      
      // Notify React Native that the page is ready
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'PAGE_READY'
      }));
      
      console.log('WebView JavaScript initialized');
    })();
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'PAGE_READY' && pushToken) {
        // Page is ready, inject the token
        const injectTokenScript = `
          (function() {
            localStorage.setItem('expoPushToken', '${pushToken}');
            console.log('Push token injected after page ready:', '${pushToken}');
          })();
        `;
        webViewRef.current?.injectJavaScript(injectTokenScript);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://macrossover.com' }}
        style={{ flex: 1 }}
        originWhitelist={['*']}
        setSupportMultipleWindows={false}
        injectedJavaScript={injectedJS}
        onMessage={handleMessage}
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


import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StatusBar, BackHandler } from 'react-native';

import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

import { auth } from './src/firebase/firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';

import { initDatabase } from './src/database/dbCore';
import { isLocalDatabaseEmpty, restoreUserData } from './src/firebase/sync';

import Dashboard from './src/screens/Dashboard';
import LoginScreen from './src/screens/LoginScreen';
import AddCard from './src/screens/AddCard';
import CardDetail from './src/screens/CardDetail';
import AddTransaction from './src/screens/AddTransaction';
import EditCard from './src/screens/EditCard';
import EditTransaction from './src/screens/EditTransaction';
import PaymentSummary from './src/screens/PaymentSummary';
import Settings from './src/screens/Settings';
import UserProfile from './src/screens/UserProfile';
import ChangePassword from './src/screens/ChangePassword';


function AppContent() {
  const { colors, theme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('Dashboard');
  const [screenParams, setScreenParams] = useState<any>({});
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    // Auth Listener
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        setCurrentScreen('Dashboard'); // Reset to Dashboard on login
        setScreenParams({});
      }
    });

    init();
    return unsubscribe;
  }, []);

  useEffect(() => {
    const performRestoreIfNeeded = async () => {
      if (user && isDbReady) {
        const empty = await isLocalDatabaseEmpty();
        if (empty) {
          console.log('🔄 Data Restore: Checking cloud backup...');
          setIsRestoring(true);
          await restoreUserData(user.uid);
          setIsRestoring(false);
          // Force refresh by resetting screen logic or just letting React update
          // ensure Dashboard re-fetches data if it's already mounted?
          // Dashboard uses useFocusEffect mostly, or useEffect on mount.
          // If we are on Dashboard, we might need to trigger a reload.
          setCurrentScreen('Dashboard');
        }
      }
    };
    performRestoreIfNeeded();
  }, [user, isDbReady]);

  async function init() {
    try {
      await initDatabase();
      setIsDbReady(true);
    } catch (error) {
      console.log('❌ Error initializing app:', error);
    }
  }



  // Handle Hardware Back Button
  useEffect(() => {
    const backAction = () => {
      if (!user) return false; // Default behavior (exit) if not logged in (or handled by LoginScreen)

      if (currentScreen === 'Dashboard') {
        return false; // Exit app
      }

      // Manual goBack logic matching the function below
      // We can't call goBack directly safely if it depends on scope variables not in dep array, 
      // but here goBack logic is simple enough to map.
      // However, calling goBack() is cleaner if we include it in deps.
      goBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [currentScreen, user, screenParams]); // Re-bind when screen changes

  const navigate = (screen: string, params: any = {}) => {
    setScreenParams(params);
    setCurrentScreen(screen);
  };

  const goBack = () => {
    if (currentScreen === 'AddTransaction') {
      navigate('CardDetail', { cardId: screenParams.cardId });
    } else if (currentScreen === 'CardDetail') {
      navigate('Dashboard');
    } else if (currentScreen === 'AddCard') {
      navigate('Dashboard');
    } else if (currentScreen === 'EditCard') {
      navigate('CardDetail', { cardId: screenParams.cardId });
    } else if (currentScreen === 'EditTransaction') {
      navigate('CardDetail', { cardId: screenParams.cardId });
    } else if (currentScreen === 'PaymentSummary') {
      navigate('CardDetail', { cardId: screenParams.cardId });
    } else if (currentScreen === 'Settings') {
      navigate('Dashboard');
    } else if (currentScreen === 'UserProfile') {
      navigate('Settings');
    } else if (currentScreen === 'ChangePassword') {
      navigate('Settings');
    } else {
      navigate('Dashboard');
    }
  };




  if (authLoading || !isDbReady || isRestoring) {
    let message = 'Iniciando...';
    if (!isDbReady) message = 'Cargando base de datos...';
    else if (authLoading) message = 'Verificando sesión...';
    else if (isRestoring) message = 'Restaurando copia de seguridad...';

    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 20, color: colors.text, fontSize: 16 }}>{message}</Text>
      </View>
    );
  }




  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar
          barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <LoginScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {currentScreen === 'Dashboard' && (
        <Dashboard
          onNavigate={navigate}
          onLogout={() => auth.signOut()}
        />
      )}

      {currentScreen === 'AddCard' && (
        <AddCard onNavigate={navigate} onBack={goBack} />
      )}

      {currentScreen === 'CardDetail' && (
        <CardDetail
          cardId={screenParams.cardId}
          onNavigate={navigate}
          onBack={goBack}
        />
      )}

      {currentScreen === 'AddTransaction' && (
        <AddTransaction
          cardId={screenParams.cardId}
          onBack={goBack}
        />
      )}

      {currentScreen === 'EditCard' && (
        <EditCard
          cardId={screenParams.cardId}
          onNavigate={navigate}
          onBack={goBack}
        />
      )}

      {currentScreen === 'EditTransaction' && (
        <EditTransaction
          transactionId={screenParams.transactionId}
          cardId={screenParams.cardId}
          onBack={goBack}
        />
      )}

      {currentScreen === 'PaymentSummary' && (
        <PaymentSummary
          cardId={screenParams.cardId}
          cutOffDate={screenParams.cutOffDate}
          onBack={goBack}
          onPaymentSuccess={() => navigate('CardDetail', { cardId: screenParams.cardId })}
        />
      )}

      {currentScreen === 'Settings' && (
        <Settings onNavigate={navigate} onBack={goBack} />
      )}

      {currentScreen === 'UserProfile' && (
        <UserProfile onBack={goBack} />
      )}

      {currentScreen === 'ChangePassword' && (
        <ChangePassword onBack={goBack} />
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
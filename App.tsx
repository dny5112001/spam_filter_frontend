import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  PermissionsAndroid,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import {LinearGradient} from 'react-native-linear-gradient';

const App = () => {
  const [smsList, setSmsList] = useState([]);
  const [checkedSms, setCheckedSms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const getSMS = async () => {
    setIsLoading(true);
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS Permission',
          message: 'This app needs access to your SMS messages.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        const filter = {
          box: 'inbox',
          indexFrom: 0,
          maxCount: 10,
        };

        SmsAndroid.list(
          JSON.stringify(filter),
          fail => {
            console.error('Failed with error: ' + fail);
            setIsLoading(false);
          },
          (count, smsList) => {
            const messages = JSON.parse(smsList);
            setSmsList(messages);
            checkSpam(messages);
          },
        );
      } else {
        console.log('SMS permission denied');
        setIsLoading(false);
      }
    } catch (err) {
      console.warn(err);
      setIsLoading(false);
    }
  };

  const checkSpam = async messages => {
    try {
      const results = await Promise.all(
        messages.map(async sms => {
          const response = await fetch('http://192.168.0.104:5000/predict', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({text: sms.body}),
          });

          if (!response.ok) {
            throw new Error('Network response was not ok');
          }

          const data = await response.json();
          console.log(data);
          return {...sms, isSpam: data.prediction === 'spam'};
        }),
      );
      setCheckedSms(results);
    } catch (error) {
      console.error('Error checking spam:', error);
      Alert.alert('Error', 'Failed to check messages for spam.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getSMS();
  }, []);

  const renderSmsItem = ({item}) => (
    <LinearGradient
      colors={item.isSpam ? ['#FFE5E5', '#FFF0F0'] : ['#E5FFE5', '#F0FFF0']}
      style={styles.smsItem}>
      <View style={styles.smsHeader}>
        <Text style={styles.smsFrom} numberOfLines={1}>
          {item.address}
        </Text>
        <Text style={styles.smsDate}>
          {new Date(parseInt(item.date)).toLocaleString()}
        </Text>
      </View>
      <Text style={styles.smsBody} numberOfLines={2}>
        {item.body}
      </Text>
      <View style={styles.spamIndicator}>
        <Icon
          name={item.isSpam ? 'warning' : 'shield-checkmark'}
          size={20}
          color={item.isSpam ? '#FF4040' : '#40FF40'}
        />
        <Text
          style={[
            styles.spamText,
            {color: item.isSpam ? '#FF4040' : '#40FF40'},
          ]}>
          {item.isSpam ? 'Potential Spam' : 'Not Spam'}
        </Text>
      </View>
    </LinearGradient>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4A90E2" />
      <LinearGradient colors={['#4A90E2', '#5AA3FF']} style={styles.header}>
        <Text style={styles.title}>SMS Spam Shield</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={getSMS}
          disabled={isLoading}>
          <Icon name="refresh" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Checking messages...</Text>
        </View>
      ) : (
        <FlatList
          data={checkedSms}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderSmsItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  listContainer: {
    padding: 16,
  },
  smsItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  smsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  smsFrom: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    flex: 1,
  },
  smsDate: {
    fontSize: 12,
    color: '#666666',
  },
  smsBody: {
    fontSize: 14,
    color: '#444444',
    marginBottom: 12,
  },
  spamIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  spamText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#4A90E2',
    marginTop: 12,
  },
});

export default App;

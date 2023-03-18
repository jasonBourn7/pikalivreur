import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, Text, Alert, TouchableOpacity, Linking, StyleSheet, ScrollView, ActivityIndicator, PermissionsAndroid } from 'react-native';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import Geolocation from 'react-native-geolocation-service';

const Stack = createStackNavigator();

const LoginPage = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'darkslategray',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 50,
    },
    inputContainer: {
      width: '100%',
      marginBottom: 20,
    },
    input: {
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 5,
      padding: 10,
      marginBottom: 10,
    },
    button: {
      marginTop: 20,
    },
    error: {
      color: 'red',
      marginTop: 10,
    },
  });

  const handleLogin = async () => {
    const url = 'https://api-delivery-e5yw.onrender.com/login';
    const data = {
      username: username,
      password: password,
    };

    setIsLoading(true);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const user = await response.json();

      if (user && user.role === 'livreur') {
        navigation.navigate('Livreur', { name: user.username });
        // Stockage du token d'authentification dans le stockage local
        await AsyncStorage.setItem('authToken', response.headers.get('Authorization'));
      } else if (user && user.role === 'admin') {
        console.log(user)
        navigation.navigate('Admin', { name: user.admin.username });
        // Stockage du token d'authentification dans le stockage local
        await AsyncStorage.setItem('authToken', response.headers.get('Authorization'));
      } else {
        setErrorMessage('Nom d\'utilisateur ou mot de passe invalide');
      }
    } catch (error) {
      setErrorMessage('Nom d\'utilisateur ou mot de passe invalide');
    }

    setIsLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connexion</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nom d'utilisateur"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          secureTextEntry={true}
          value={password}
          onChangeText={setPassword}
        />
      </View>
      {isLoading ? (
        <ActivityIndicator size="large" color="#fff" />
      ) : (
        <Button style={styles.button} title="Se connecter" onPress={handleLogin} />
      )}
      {errorMessage !== '' && <Text style={styles.error}>{errorMessage}</Text>}
    </View>
  );
}

function LivreurPage() {
  const [sharingPosition, setSharingPosition] = useState(false);
  const [position, setPosition] = useState(null);
  const [count, setCount] = useState(null);
  const [count2, setCount2] = useState(null);
  const [courses, setCourses] = useState([]);
  const [nomsDeCommandes, setNomsDeCommandes] = useState([]);
  const [nomsDeCommandesSupprimes, setNomsDeCommandesSupprimes] = useState([]);
  const [commandesSupprimees, setCommandesSupprimees] = useState([]);

  const route = useRoute();
  const { name } = route.params;

  useEffect(() => {
    let watchId;
    if (sharingPosition) {
      watchId = Geolocation.watchPosition(
        (position) => {
          setPosition(position);
          fetch('https://api-delivery-e5yw.onrender.com/updatePosition', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              username: name,
              longitude: position.coords.longitude,
              latitude: position.coords.latitude
            })
          })
            .then(response => response.json())
            .then(data => console.log(data))
            .catch(error => console.error(error));
        },
        (error) => {
          console.error(error);
          setPosition(null);
        },
        { enableHighAccuracy: true, distanceFilter: 10, interval: 6000 } // enregistrer la position toutes les 6 secondes
      );
      Alert.alert('Carré', 'position activée');
    } else {
      Geolocation.clearWatch(watchId);
      Alert.alert('Carré', 'position désactivée');
    }
    return () => Geolocation.clearWatch(watchId);
  }, [sharingPosition]);

  const toggleSharingPosition = async () => {
    setSharingPosition(prevState => !prevState);
    Alert.alert('Carré', sharingPosition ? 'position désactivée' : 'position activée');
  
    if (!sharingPosition) {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Permission de localisation',
              message: 'L\'application a besoin de votre position pour fonctionner.'
            }
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            Geolocation.watchPosition(
              (position) => {
                setPosition(position);
                fetch('https://api-delivery-e5yw.onrender.com/updatePosition', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    username: name,
                    longitude: position.coords.longitude,
                    latitude: position.coords.latitude
                  })
                })
                  .then(response => response.json())
                  .then(data => console.log(data))
                  .catch(error => console.error(error));
              },
              (error) => {
                console.error(error);
                setPosition(null);
              },
              { enableHighAccuracy: true, distanceFilter: 10, interval: 6000 } // enregistrer la position toutes les 6 secondes
            );
          } else {
            Alert.alert('Carré', 'La permission de localisation a été refusée.');
          }
        } else {
          Geolocation.requestAuthorization();
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      Geolocation.clearWatch();
    }
  };

  useEffect(() => {
    // AsyncStorage.getItem('sharingPosition')
    //   .then(value => {
    //     if (value !== null) {
    //       setSharingPosition(value === 'true');
    //     }
    //   })
    //   .catch(error => console.error(error));
  }, []);

  useEffect(() => {
    const fetchCommandes = async () => {
      const response = await fetch(`https://api-delivery-e5yw.onrender.com/livreurs/${name}/courses?supprimer=false`);
      const data = await response.json();
      setNomsDeCommandes(data.nomsDeCommandes);
      setCount(data.count);
    };
    const interval = setInterval(fetchCommandes, 5000); // exécuter fetchCommandes toutes les 10 secondes

    // nettoyer l'intervalle lorsque le composant est démonté
    return () => clearInterval(interval);
  }, [name]);

  //le nbr de commande
  useEffect(() => {
    const fetchCommandes = async () => {
      try {
        const response = await fetch(`https://api-delivery-e5yw.onrender.com/commandes/livreur/${name}/nombre`);
        const data = await response.json();
        setCount2(data.nombreCommandes);
      } catch (err) {
        console.error(err);
        setCount2(0);
      }
    };
    fetchCommandes();

    const intervalId = setInterval(fetchCommandes, 8000); // appel à la fonction fetchCommandes() toutes les 8 secondes

    return () => clearInterval(intervalId); // nettoyage de l'intervalle lors du démontage du composant
  }, [name]);

  // Afficher les courses dans l'ordre inverse d'insertion
  const reversedCourses = [...courses].reverse();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'darkslategray',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
    },
    button: {
      marginTop: 20,
      width: '100%',
      height: 50,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0080FF',
    },
    buttonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },
    section: {
      width: '100%',
      marginBottom: 20,
    },
    input: {
      borderWidth: 1,
      borderColor: 'gray',
      borderRadius: 5,
      paddingHorizontal: 10,
      marginBottom: 10,
      height: 40,
      width: '100%',
    },
    livreurProche: {
      borderBottomWidth: 1,
      padding: 10,
      width: '100%',
    },
    info: {
      marginBottom: 5,
      fontSize: 16,
    },
    deleteButton: {
      backgroundColor: 'green',
      padding: 5,
      borderRadius: 5,
    },
    deleteButtonText: {
      color: 'black',
      fontWeight: 'bold',
    },
  });

  const supprimerCommande = async (id) => {
    const newNomsDeCommandes = nomsDeCommandes.map(commande => commande.id === id ? { ...commande, supprime: true } : commande);
    setNomsDeCommandes(newNomsDeCommandes);

    try {
      const response = await fetch(`https://api-delivery-e5yw.onrender.com/commandes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supprimer: true,
        }),
      });
      if (!response.ok) {
        throw new Error('Erreur de suppression');
      }
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <ScrollView>
      <View style={styles.container}>
        <Text style={styles.title}>Bienvenue {name} ! {'\n'}{'\n'}Tu as {count} livraison(s) en cours {'\n'}et effectuer {count2} course(s).</Text>
        <TouchableOpacity onPress={toggleSharingPosition} style={styles.button}>
          <Text style={styles.buttonText}>
            {sharingPosition ? 'Arrêter le partage de position' : 'Partager ma position'}
          </Text>
        </TouchableOpacity>
        {position && (
          <Text style={styles.section}>
            Position: {position.coords.latitude}, {position.coords.longitude}
          </Text>
        )}
        <Text>{'\n'}</Text>
        {nomsDeCommandes && nomsDeCommandes.map((commande, index) => (
          !commande.supprime && (
            <View key={index} style={styles.section}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 1 }}>Numéro de la central:</Text>
                <TouchableOpacity onPress={() => Linking.openURL(`https://t.me/${commande.phone}`)}>
                  <Text style={[styles.info, { flex: 1 }]}>{commande.phone}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.info}>Nom de l'admin : {commande.admin}</Text>
              <TouchableOpacity onPress={() => Linking.openURL(`https://maps.google.com?q=${encodeURIComponent(commande.adresse)}`)}>
                <Text style={styles.info}>Adresse de livraison :</Text>
                <TouchableOpacity onPress={() => Linking.openURL(`https://maps.google.com?q=${encodeURIComponent(commande.adresse)}`)}>
                  <Text style={styles.link}>{commande.adresse}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
              <Text style={styles.info}><Text>{'\n'}</Text>Produits: {commande.produit}</Text>
              <Text style={styles.info}>Prix : {commande.prix} €</Text>
              <TouchableOpacity onPress={() => supprimerCommande(commande.id)} style={styles.button}>
                <Text style={styles.buttonText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          )
        ))}

      </View>
    </ScrollView>
  );

}

function AdminPage() {
  const [livreurName, setLivreurName] = useState('');
  const [livreurPhone, setLivreurPhone] = useState('');
  const [livreurPassword, setLivreurPassword] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adresse, setAdresse] = useState('');
  const [livreursPositions, setLivreursPositions] = useState([]);
  const [livreurProche, setLivreurPlusProche] = useState(null);
  const [nomLivreur, setNomLivreur] = useState('');
  const [phone, setPhone] = useState('');
  const [produit, setProduit] = useState('');
  const [quantite, setQuantite] = useState('');
  const [produitQuantite, setProduitQuantite] = useState('');
  const [prix, setPrix] = useState('');
  const [livreurs, setLivreurs] = useState([]);
  const route = useRoute();
  const { name } = route.params;

  const handleAddLivreur = async () => {
    const url = 'https://api-delivery-e5yw.onrender.com/addLivreurs';
    const data = {
      username: livreurName,
      password: livreurPassword,
      telephone: livreurPhone,
      position: {
        type: 'Point',
        coordinates: [2.294481, 48.858370] // Position de la Tour Eiffel
      },
      adminName: name // Remplacez "admin1" par le nom de l'admin qui ajoute le livreur
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert('Succès', 'Le livreur a été ajouté avec succès');
        updateFields(); // Appel de la fonction pour actualiser les champs
      } else {
        Alert.alert('Erreur', result.message);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'ajout du livreur');
    }
  };

  const handleAddAdmin = async () => {
    const url = 'https://api-delivery-e5yw.onrender.com/addAdmins';
    const data = {
      username: adminName,
      password: adminPassword,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      updateFields(); // Appel de la fonction pour actualiser les champs
      console.log(result); // Message pour le débogage (à enlever après)

      if (result.error) {
        Alert.alert('Erreur', result.message);
      } else {
        Alert.alert('Succès', 'L\'administrateur a été ajouté avec succès');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'ajout de l\'administrateur');
    }
  };

  const updateFields = () => {
    // Actualisation des champs
    setLivreurName('');
    setLivreurPhone('');
    setLivreurPassword('');
    setAdminName('');
    setAdminPassword('');
    setNomLivreur('');
    setPhone('');
    setProduit('');
    setQuantite('');
    setPrix('');
    setAdresse('');
    setProduitQuantite('');
  };

  const handleSearchAdresse = async () => {
    const formattedAdresse = encodeURIComponent(adresse);
    const url = `https://nominatim.openstreetmap.org/search?q=${formattedAdresse}&format=json`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.length > 0) {
        const { lat, lon } = data[0];
        console.log(`Latitude: ${lat}, Longitude: ${lon}`);

        // Récupérer les positions des livreurs
        const livreursUrl = 'https://api-delivery-e5yw.onrender.com/livreurs/positions';
        const livreursResponse = await fetch(livreursUrl);
        const livreursData = await livreursResponse.json();
        console.log('Positions des livreurs:', livreursData);

        // Calculer la distance entre l'adresse et chaque livreur
        const R = 6371; // Rayon de la Terre en km
        const livreursAvecDistance = livreursData.map(livreur => {
          const lat2 = livreur.position[1];
          const lon2 = livreur.position[0];
          const dLat = toRadians(lat2 - lat);
          const dLon = toRadians(lon2 - lon);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;
          return { ...livreur, distance };
        });

        // Trier les livreurs par ordre croissant de distance
        livreursAvecDistance.sort((a, b) => a.distance - b.distance);

        console.log('Livreurs triés par distance:', livreursAvecDistance);

        // Prendre le livreur le plus proche
        const livreurPlusProche = livreursAvecDistance[0];
        console.log('Livreur le plus proche:', livreurPlusProche);

        // Mettre à jour l'état avec les positions des livreurs et le livreur le plus proche
        setLivreursPositions(livreursData);
        setLivreurPlusProche(livreurPlusProche);
      } else {
        console.log('Aucune adresse trouvée');
      }
    } catch (error) {
      console.error(error);
    }
  };

  function toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  const styles = StyleSheet.create({
    scrollView: {
      flex: 1,
      backgroundColor: '#F5F5F5', // Couleur de fond de l'application
    },
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingHorizontal: 20,
      paddingTop: 20,
      backgroundColor: 'darkslategray'
    },
    welcome: {
      fontSize: 20,
      textAlign: 'center',
      marginBottom: 20,
    },
    section: {
      width: '100%',
      marginBottom: 20,
    },
    title: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    input: {
      borderWidth: 1,
      borderColor: 'gray',
      borderRadius: 5,
      paddingHorizontal: 10,
      marginBottom: 10,
      height: 40,
    },
    button: {
      marginTop: 10,
      backgroundColor: '#2196F3',
      borderRadius: 5,
      padding: 10,
    },
    buttonText: {
      color: '#fff',
      textAlign: 'center',
    },
    livreurProche: {
      borderBottomWidth: 1,
      padding: 10,
    },
    info: {
      marginBottom: 5,
    },
  });

  const ajouterCommande = async () => {
    const [produit,] = produitQuantite.split(':');
    const sumQuantite = produit.match(/\d+/g).map(Number);
    const quantite = sumQuantite.reduce((acc, val) => acc + val, 0);
    console.log(quantite); // ajouter cette ligne pour vérifier la valeur de quantite
    const response = await fetch('https://api-delivery-e5yw.onrender.com/commandes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nomLivreur,
        phone,
        adresse,
        produit,
        quantite,
        prix,
        supprime: false, // Ajout de la colonne "supprime" sur false par défaut
        username: name, // Remplacez 'admin' par le nom ou l'ID de l'administrateur connecté
      }),
    });

    if (!response.ok) {
      Alert.alert('Erreur', 'Impossible d\'ajouter la commande');
      return;
    }

    const responseData = await response.json();

    Alert.alert('Succès', `Commande ajoutée avec succès nom du livreur : ${nomLivreur}`);
    updateFields(); // Appel de la fonction pour actualiser les champs
  };

  // Appel à l'API pour récupérer les livreurs
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('https://api-delivery-e5yw.onrender.com/livreurs');
        const data = await response.json();
        setLivreurs(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();

    const intervalId = setInterval(fetchData, 10000); // appel à la fonction fetchData() toutes les 10 secondes

    return () => clearInterval(intervalId); // nettoyage de l'intervalle lors du démontage du composant
  }, []);

  return (
    <ScrollView>
      <View style={styles.container}>
        <Text style={styles.welcome}>Bienvenue {name} !{"\n"}</Text>

        {/* Section pour rechercher une adresse et afficher les positions des livreurs */}
        <View style={styles.section}>
          <Text style={styles.title}>RECHERCHER UNE ADRESSE</Text>
          <TextInput
            style={styles.input}
            placeholder="Adresse à rechercher"
            value={adresse}
            onChangeText={setAdresse}
          />
          <Button style={styles.button} title="Rechercher une adresse" onPress={handleSearchAdresse} />

          {/* Affichage du livreur le plus proche */}
          <View style={styles.livreurProche}>
            {livreurProche ? (
              <>
                <Text style={styles.info}>Nom: {livreurProche.username}</Text>
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${livreurProche.phone}`)}>
                  <Text style={styles.info}>Téléphone: {livreurProche.phone}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.info}>Aucun livreur à proximité</Text>
            )}
          </View>

          {/* Ajouter un espace */}
          <View style={{ height: 20 }} />

          {/* Section pour ajouter une commande */}


          <View style={styles.container}>
            <View>
              <Text style={styles.title}>AJOUTER UNE COMMANDE</Text>
            </View>
            <View style={styles.formContainer}>
              <Text style={styles.label}>Nom du livreur:</Text>
              <Picker
                selectedValue={nomLivreur}
                onValueChange={(itemValue, itemIndex) => setNomLivreur(itemValue)}
                style={styles.input}
              >
                {livreurs.map(livreur => (
                  <Picker.Item key={livreur._id} label={livreur.username} value={livreur.username} />
                ))}
              </Picker>

              <Text style={styles.label}>Téléphone:</Text>
              <TextInput
                value={phone}
                placeholder="Numéro de la central"
                onChangeText={setPhone}
                style={styles.input}
              />

              <Text style={styles.label}>Adresse:</Text>
              <TextInput
                value={adresse}
                placeholder="Adresse de livraison"
                onChangeText={setAdresse}
                style={styles.input}
              />

              <Text style={styles.label}>Produit et quantité:</Text>
              <TextInput
                value={produitQuantite}
                placeholder="Produit et quantité"
                onChangeText={text => {
                  const regex = /^([\w\s]+):\s?([\d\w\s]+)$/i;
                  const match = text.match(regex);
                  if (match) {
                    const prod = match[1].trim();
                    const quant = match[2].trim();
                    setProduit(prod);
                    setQuantite(quant);
                    setProduitQuantite(text);
                  } else {
                    setProduitQuantite(text);
                  }
                }}
                style={styles.input}
              />

              <Text style={styles.label}>Prix:</Text>
              <TextInput
                value={prix}
                placeholder="Somme de la commande"
                onChangeText={setPrix}
                style={styles.input}
              />

              <Button title="Ajouter la commande" onPress={ajouterCommande} />
            </View>
          </View>


        </View>

        {/* Ajouter un espace */}
        <View style={{ height: 20 }} />

        {/* Section pour ajouter un livreur */}
        <View style={styles.section}>
          <Text style={styles.title}>AJOUTER UN LIVREUR</Text>
          <TextInput
            style={styles.input}
            placeholder="Nom du livreur"
            value={livreurName}
            onChangeText={setLivreurName}
          />
          <TextInput
            style={styles.input}
            placeholder="Téléphone du livreur"
            value={livreurPhone}
            onChangeText={setLivreurPhone}
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe du livreur"
            value={livreurPassword}
            onChangeText={setLivreurPassword}
            secureTextEntry={true}
          />
          <Button style={styles.button} title="Ajouter un livreur" onPress={handleAddLivreur} />
        </View>

        {/* Ajouter un espace */}
        <View style={{ height: 20 }} />

        {/* Section pour ajouter un administrateur */}
        <View style={styles.section}>
          <Text style={styles.title}>AJOUTER UN ADMINISTRATEUR{"\n"}</Text>
          <TextInput
            style={styles.input}
            placeholder="Nom d'utilisateur"
            value={adminName}
            onChangeText={setAdminName}
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            value={adminPassword}
            onChangeText={setAdminPassword}
            secureTextEntry={true}
          />
          <Button style={styles.button} title="Ajouter un administrateur" onPress={handleAddAdmin} />
        </View>

      </View>
    </ScrollView>
  );

}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Delivery" component={LoginPage} />
        <Stack.Screen name="Livreur" component={LivreurPage} />
        <Stack.Screen name="Admin" component={AdminPage} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
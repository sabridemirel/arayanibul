import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    SafeAreaView,
    FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CATEGORIES } from '../data/categories';
import { MOCK_ADS } from '../data/mockData';

interface Props {
    navigation: any;
    onLoginPress: () => void;
}

const MainScreen: React.FC<Props> = ({ navigation, onLoginPress }) => {
    const urgentAds = MOCK_ADS.filter(ad => ad.isUrgent);
    const recentAds = MOCK_ADS.slice(0, 4);

    const renderCategoryItem = ({ item }: { item: any }) => (
        <TouchableOpacity style={[styles.categoryCard, { backgroundColor: item.color }]}>
            <MaterialIcons name={item.icon} size={18} color="#fff" />
            <Text style={styles.categoryText}>{item.name}</Text>
        </TouchableOpacity>
    );

    const renderAdItem = (ad: any) => (
        <TouchableOpacity key={ad.id} style={styles.adCard}>
            <View style={styles.adHeader}>
                <View style={styles.adTitleContainer}>
                    <Text style={styles.adTitle} numberOfLines={1}>{ad.title}</Text>
                    {ad.isUrgent && (
                        <View style={styles.urgentBadge}>
                            <Text style={styles.urgentText}>ACİL</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.adTime}>{ad.createdAt}</Text>
            </View>

            <Text style={styles.adDescription} numberOfLines={2}>
                {ad.description}
            </Text>

            <View style={styles.adFooter}>
                <View style={styles.adInfo}>
                    <MaterialIcons name="location-on" size={14} color="#666" />
                    <Text style={styles.adLocation}>{ad.location}</Text>
                </View>
                <Text style={styles.adBudget}>{ad.budget}</Text>
            </View>

            <View style={styles.adUser}>
                <MaterialIcons name="person" size={16} color="#666" />
                <Text style={styles.userName}>{ad.user.name}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Image
                        source={require('../assets/images/logo.jpg')}
                        style={styles.headerLogo}
                        resizeMode="contain"
                    />
                    <Text style={styles.headerTitle}>Arayanibul</Text>
                </View>
                <TouchableOpacity style={styles.loginButton} onPress={onLoginPress}>
                    <MaterialIcons name="person" size={20} color="#007bff" />
                    <Text style={styles.loginText}>Giriş</Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Welcome Section */}
                <View style={styles.welcomeSection}>
                    <Text style={styles.welcomeTitle}>Ne Arıyorsun?</Text>
                    <Text style={styles.welcomeSubtitle}>
                        İhtiyacını ilan et, en uygun teklifleri al
                    </Text>
                </View>

                {/* Categories - Horizontal Scroll */}
                <View style={styles.categoriesSection}>
                    <Text style={styles.sectionTitle}>Kategoriler</Text>
                    <FlatList
                        data={CATEGORIES}
                        renderItem={renderCategoryItem}
                        keyExtractor={(item) => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoriesHorizontal}
                    />
                </View>

                {/* Urgent Ads */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>🚨 Acil Arananlar</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>Tümünü Gör</Text>
                        </TouchableOpacity>
                    </View>
                    {urgentAds.map(renderAdItem)}
                </View>

                {/* Recent Ads */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>🕒 Son Eklenenler</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>Tümünü Gör</Text>
                        </TouchableOpacity>
                    </View>
                    {recentAds.map(renderAdItem)}
                </View>

                {/* CTA Section */}
                <View style={styles.ctaSection}>
                    <Text style={styles.ctaTitle}>Sen de İlan Ver!</Text>
                    <Text style={styles.ctaSubtitle}>
                        Aradığın ürün veya hizmeti ilan et, teklifler gelsin
                    </Text>
                    <TouchableOpacity style={styles.ctaButton} onPress={onLoginPress}>
                        <MaterialIcons name="add" size={20} color="#fff" />
                        <Text style={styles.ctaButtonText}>İlan Ver</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerLogo: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#007bff',
    },
    loginButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#007bff',
    },
    loginText: {
        color: '#007bff',
        marginLeft: 4,
        fontSize: 14,
        fontWeight: '500',
    },
    welcomeSection: {
        padding: 20,
        alignItems: 'center',
        backgroundColor: '#fff',
        marginBottom: 10,
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    welcomeSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    section: {
        backgroundColor: '#fff',
        marginBottom: 10,
        paddingVertical: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    seeAllText: {
        color: '#007bff',
        fontSize: 14,
        fontWeight: '500',
    },
    categoriesSection: {
        backgroundColor: '#fff',
        paddingVertical: 15,
        marginBottom: 10,
    },
    categoriesHorizontal: {
        paddingHorizontal: 15,
    },
    categoryCard: {
        marginHorizontal: 5,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        minWidth: 100,
    },
    categoryText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 6,
        textAlign: 'center',
    },
    adCard: {
        marginHorizontal: 20,
        marginBottom: 15,
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#007bff',
    },
    adHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    adTitleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    adTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    urgentBadge: {
        backgroundColor: '#ff4757',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 8,
    },
    urgentText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    adTime: {
        fontSize: 12,
        color: '#666',
    },
    adDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 10,
    },
    adFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    adInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    adLocation: {
        fontSize: 12,
        color: '#666',
        marginLeft: 4,
    },
    adBudget: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#28a745',
    },
    adUser: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userName: {
        fontSize: 12,
        color: '#666',
        marginLeft: 4,
    },
    ctaSection: {
        backgroundColor: '#007bff',
        margin: 20,
        padding: 30,
        borderRadius: 16,
        alignItems: 'center',
    },
    ctaTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    ctaSubtitle: {
        fontSize: 14,
        color: '#fff',
        textAlign: 'center',
        marginBottom: 20,
        opacity: 0.9,
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
    },
    ctaButtonText: {
        color: '#007bff',
        fontWeight: 'bold',
        marginLeft: 8,
    },
});

export default MainScreen;
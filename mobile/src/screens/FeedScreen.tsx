import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Image,
  Text,
  TouchableOpacity,
  RefreshControl,
  Keyboard,
} from 'react-native';
import { AxiosInstance } from 'axios';

interface Post {
  id: number;
  user_id: number;
  username: string;
  avatar_url?: string;
  text: string;
  image_url?: string;
  time_ago: string;
  authenticity_score: number;
  ranking_score: number;
  interaction_count: number;
  user_has_interacted: boolean;
}

interface SearchResult {
  id: number;
  user_id: number;
  username: string;
  text: string;
  similarity_score: number;
}

interface FeedScreenProps {
  apiClient: AxiosInstance;
  authToken: string;
}

export const FeedScreen: React.FC<FeedScreenProps> = ({ apiClient, authToken }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const POSTS_PER_PAGE = 20;

  // Fetch feed posts
  const fetchFeed = useCallback(
    async (page: number = 1, refresh: boolean = false) => {
      try {
        setError(null);
        if (page === 1) setIsLoading(true);

        const response = await apiClient.get('/api/feed', {
          params: { page, limit: POSTS_PER_PAGE },
          headers: { Authorization: `Bearer ${authToken}` },
        });

        const newPosts = response.data.data;
        setPosts((prevPosts) => (page === 1 ? newPosts : [...prevPosts, ...newPosts]));
        setCurrentPage(page);
        setHasMorePages(response.data.pagination.has_next);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load feed');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [apiClient, authToken]
  );

  // Search posts
  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      try {
        setIsSearching(true);
        const response = await apiClient.get('/api/search', {
          params: { q: query, limit: 10 },
          headers: { Authorization: `Bearer ${authToken}` },
        });

        setSearchResults(response.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Search failed');
      } finally {
        setIsSearching(false);
      }
    },
    [apiClient, authToken]
  );

  // Log interaction (view)
  const logInteraction = useCallback(
    async (postId: number, interactionType: 'view' | 'reply' | 'reaction' = 'view') => {
      try {
        await apiClient.post(
          '/api/interactions',
          { post_id: postId, interaction_type: interactionType },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
      } catch (err) {
        console.error('Failed to log interaction:', err);
      }
    },
    [apiClient, authToken]
  );

  // Initial load
  useEffect(() => {
    fetchFeed(1);
  }, [fetchFeed]);

  // Handle infinite scroll
  const handleEndReached = useCallback(() => {
    if (hasMorePages && !isLoading && posts.length > 0) {
      fetchFeed(currentPage + 1);
    }
  }, [currentPage, hasMorePages, isLoading, fetchFeed, posts.length]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchFeed(1, true);
  }, [fetchFeed]);

  // Post card component
  const PostCard = ({ item }: { item: Post }) => (
    <TouchableOpacity
      style={styles.postCard}
      onPress={() => logInteraction(item.id, 'view')}
      activeOpacity={0.8}
    >
      <View style={styles.postHeader}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{item.username.charAt(0).toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.headerInfo}>
          <Text style={styles.username}>{item.username}</Text>
          <Text style={styles.timeAgo}>{item.time_ago}</Text>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Auth:</Text>
          <Text style={[styles.score, getAuthenticityColor(item.authenticity_score)]}>
            {(item.authenticity_score * 100).toFixed(0)}%
          </Text>
        </View>
      </View>

      <Text style={styles.postText}>{item.text}</Text>

      {item.image_url && (
        <Image
          source={{ uri: item.image_url }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.postFooter}>
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>{item.interaction_count} interactions</Text>
          <Text style={styles.rankerScore}>
            Rank: {(item.ranking_score * 100).toFixed(0)}%
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.reactionButton, item.user_has_interacted && styles.reactionActive]}
          onPress={() => logInteraction(item.id, 'reaction')}
        >
          <Text style={styles.reactionEmoji}>{item.user_has_interacted ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Search result card
  const SearchResultCard = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity style={styles.searchResultCard} onPress={() => logInteraction(item.id)}>
      <Text style={styles.resultUsername}>{item.username}</Text>
      <Text style={styles.resultText} numberOfLines={2}>
        {item.text}
      </Text>
      <Text style={styles.similarityScore}>
        Match: {(item.similarity_score * 100).toFixed(0)}%
      </Text>
    </TouchableOpacity>
  );

  // Empty state
  const renderEmpty = () =>
    !isLoading ? (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No posts yet</Text>
        <Text style={styles.emptySubtext}>Pull to refresh or try searching</Text>
      </View>
    ) : null;

  // Error state
  const renderError = () =>
    error ? (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchFeed(1)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    ) : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search posts... (e.g., 'funny travel stories')"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            handleSearch(text);
          }}
          onSubmitEditing={Keyboard.dismiss}
          returnKeyType="search"
        />
        {isSearching && <ActivityIndicator style={styles.searchSpinner} color="#FF6B35" />}
      </View>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <View style={styles.searchResultsContainer}>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => `search-${item.id}`}
            renderItem={(props) => <SearchResultCard {...props} />}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Feed or Empty/Error States */}
      {searchResults.length === 0 && (
        <>
          {renderError()}
          <FlatList
            ref={flatListRef}
            data={posts}
            keyExtractor={(item) => `post-${item.id}`}
            renderItem={(props) => <PostCard {...props} />}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={
              isLoading && posts.length > 0 ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color="#FF6B35" />
                </View>
              ) : null
            }
            contentContainerStyle={styles.feedContent}
          />
        </>
      )}
    </SafeAreaView>
  );
};

// Helper function to determine authenticity color
const getAuthenticityColor = (score: number): any => {
  if (score >= 0.8) return { color: '#27AE60' }; // Green
  if (score >= 0.6) return { color: '#F39C12' }; // Orange
  return { color: '#E74C3C' }; // Red
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  feedContent: {
    paddingVertical: 8,
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#333',
  },
  searchSpinner: {
    marginLeft: 10,
  },
  searchResultsContainer: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  searchResultCard: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  resultUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  resultText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  similarityScore: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '500',
  },
  postCard: {
    backgroundColor: '#FFF',
    marginVertical: 6,
    marginHorizontal: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  timeAgo: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  score: {
    fontSize: 14,
    fontWeight: '700',
  },
  postText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    padding: 12,
  },
  postImage: {
    width: '100%',
    height: 280,
    backgroundColor: '#F0F0F0',
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  statsContainer: {
    flex: 1,
  },
  statsText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  rankerScore: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
  },
  reactionButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
  },
  reactionActive: {
    backgroundColor: '#FFE5D9',
  },
  reactionEmoji: {
    fontSize: 20,
  },
  loaderContainer: {
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  errorContainer: {
    margin: 12,
    padding: 16,
    backgroundColor: '#FADBD8',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#E74C3C',
  },
  errorText: {
    fontSize: 14,
    color: '#C0392B',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#E74C3C',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

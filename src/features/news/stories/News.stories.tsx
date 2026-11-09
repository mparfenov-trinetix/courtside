import type { Meta, StoryObj } from '@storybook/react-native';
import { ScrollView, View } from 'react-native';

import { ArticleCard } from '../components';
import newsJson from '../../../../tests/fixtures/news.json';
import { normalizeNews } from '@/lib/espn';
import { palette } from '@/lib/theme';
import { away, home } from '@/storybook/fixtures';

const meta = { title: 'News' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// A real league feed, trimmed to one article of each kind (recap, video, news, story, preview).
const articles = normalizeNews(newsJson.feed as never);
// The fixture game's two teams stand in for the team list (the real feed's teams are other clubs, so most rows show no logos).
const teamOf = (id: string) => [home.team, away.team].find((t) => t.id === id);

/** The first article is the lead (a wide picture), the rest are rows with a thumbnail. */
export const List: Story = {
  render: () => (
    <View style={{ flex: 1, backgroundColor: palette.arena }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        {articles.map((a, i) => (
          <ArticleCard key={a.id} article={a} teamOf={teamOf} lead={i === 0} onPress={() => {}} />
        ))}
      </ScrollView>
    </View>
  ),
};

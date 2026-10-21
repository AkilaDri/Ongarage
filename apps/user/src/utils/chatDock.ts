import { Animated } from 'react-native';

/**
 * How far the floating chat icon must sit lower once the top band has folded away: the height of the bar the page keeps
 * pinned at the top (Home's banners, Activity's tiles and filters), so the icon is never on top of it. 0 where nothing is pinned.
 */
export const chatDockOffset = new Animated.Value(0);

/** How far the icon actually drops: the pinned bar's height less a little, so it tucks up close under the bar instead of floating well below it. */
export const chatDockDrop = chatDockOffset.interpolate({ inputRange: [0, 14, 2000], outputRange: [0, 0, 1986] });

/** 0 = the floating chat icon is shown, 1 = it is hidden (a screen sets it while its page scrolls up and clears it on a drag down). */
export const chatHide = new Animated.Value(0);

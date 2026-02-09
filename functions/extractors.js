const { useMainPlayer } = require("discord-player");
const { SpotifyExtractor } = require("discord-player-spotify");
const { YoutubeExtractor } = require("discord-player-youtube");
const { SoundCloudExtractor } = require("@discord-player/extractor");
const { YoutubeSabrExtractor } = require ("discord-player-googlevideo");
const log = require("../handlers/logger");

const extractor = async () => {
  const player = useMainPlayer();

  // Spotify
  await player.extractors.register(SpotifyExtractor, {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    player_id: player.id,
  });

  // // YouTube (your existing one)
  // await player.extractors.register(YoutubeExtractor, {
  //   cookie: process.env.YOUTUBE_COOKIE,
  //   filterAutoplayTracks: true,
  //   disableYTJSLog: true,
  //   streamOptions: {
  //     useClient: "WEB_EMBEDDED",
  //   },
  // });

  // SoundCloud - add this block
  await player.extractors.register(SoundCloudExtractor, {
    // Optional: client ID/secret if you want authenticated SoundCloud access
    // clientId: process.env.SOUNDCLOUD_CLIENT_ID,
    // clientSecret: process.env.SOUNDCLOUD_CLIENT_SECRET,
  });
  await player.extractors.register(YoutubeSabrExtractor, {});

  // Optional: log to confirm
   log.success("Extractors registered: Spotify, YouTube, SoundCloud");
};

module.exports = { extractor };

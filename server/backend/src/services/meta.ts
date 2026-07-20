import axios from 'axios';
import db, { schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { decrypt } from '../utils/crypto.js';

const API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';
const BASE = `https://graph.facebook.com/${API_VERSION}`;

export async function getDecryptedToken(igAccountId: number): Promise<string> {
  const [account] = await db
    .select()
    .from(schema.igAccounts)
    .where(eq(schema.igAccounts.id, igAccountId))
    .limit(1);

  if (!account) throw new Error('IG account not found');
  return decrypt(account.accessToken);
}

export async function fetchComment(commentId: string, accessToken: string) {
  const { data } = await axios.get(`${BASE}/${commentId}`, {
    params: {
      fields: 'text,from{id,username},media{id}',
      access_token: accessToken,
    },
  });
  return data;
}

export async function replyToComment(commentId: string, message: string, accessToken: string) {
  const { data } = await axios.post(
    `${BASE}/${commentId}/replies`,
    { message },
    { params: { access_token: accessToken } },
  );
  return data;
}

export async function sendDM(igUserId: string, recipientId: string, message: string, accessToken: string) {
  const { data } = await axios.post(
    `${BASE}/me/messages`,
    {
      recipient: { id: recipientId },
      message: { text: message },
    },
    { params: { access_token: accessToken } },
  );
  return data;
}

export async function refreshToken(token: string): Promise<{ access_token: string; expires_in: number }> {
  const appSecret = process.env.META_APP_SECRET!;
  const appId = process.env.META_APP_ID!;
  const { data } = await axios.get(`${BASE}/oauth/access_token`, {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: token,
    },
  });
  return data;
}

export async function exchangeCodeForToken(code: string, redirectUri: string) {
  const appSecret = process.env.META_APP_SECRET!;
  const appId = process.env.META_APP_ID!;
  const { data } = await axios.get(`${BASE}/oauth/access_token`, {
    params: {
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    },
  });
  return data as { access_token: string; expires_in: number };
}

/* ================================================================ */
/*  INSIGHTS — Instagram Metrics                                      */
/* ================================================================ */

export async function fetchInsights(igUserId: string, accessToken: string) {
  const metrics = 'reach,impressions,profile_views,follower_count,email_contacts,phone_call_clicks,text_message_clicks,get_directions_clicks,website_clicks';

  try {
    const { data } = await axios.get(`${BASE}/${igUserId}/insights`, {
      params: {
        metric: metrics,
        period: 'day',
        access_token: accessToken,
      },
    });
    return data.data || [];
  } catch {
    return [];
  }
}

export async function fetchFollowerGrowth(igUserId: string, accessToken: string) {
  try {
    const { data } = await axios.get(`${BASE}/${igUserId}/insights`, {
      params: {
        metric: 'follower_count',
        period: 'day',
        since: Math.floor(Date.now() / 1000 - 30 * 86400),
        until: Math.floor(Date.now() / 1000),
        access_token: accessToken,
      },
    });
    return data.data || [];
  } catch {
    return [];
  }
}

export async function fetchMediaInsights(igUserId: string, accessToken: string, limit = 20) {
  try {
    const { data: media } = await axios.get(`${BASE}/${igUserId}/media`, {
      params: {
        fields: 'id,caption,like_count,comments_count,timestamp,media_type,media_url',
        limit,
        access_token: accessToken,
      },
    });

    const posts = media.data || [];
    const likes: number[] = [];
    const comments: number[] = [];

    for (const post of posts) {
      likes.push(post.like_count || 0);
      comments.push(post.comments_count || 0);
    }

    const avgLikes = likes.length > 0 ? likes.reduce((a, b) => a + b, 0) / likes.length : 0;
    const avgComments = comments.length > 0 ? comments.reduce((a, b) => a + b, 0) / comments.length : 0;

    return {
      totalPosts: posts.length,
      avgLikes: Math.round(avgLikes),
      avgComments: Math.round(avgComments),
      totalLikes: likes.reduce((a, b) => a + b, 0),
      totalComments: comments.reduce((a, b) => a + b, 0),
      recentPosts: posts.slice(0, 5).map((p: any) => ({
        id: p.id,
        caption: (p.caption || '').slice(0, 100),
        likes: p.like_count || 0,
        comments: p.comments_count || 0,
        mediaType: p.media_type,
        mediaUrl: p.media_url,
        date: p.timestamp,
      })),
    };
  } catch {
    return { totalPosts: 0, avgLikes: 0, avgComments: 0, totalLikes: 0, totalComments: 0, recentPosts: [] };
  }
}

export async function getInstagramAccount(token: string) {
  const { data: me } = await axios.get(`${BASE}/me/accounts`, {
    params: { access_token: token },
  });

  for (const page of me.data ?? []) {
    const { data: pageInfo } = await axios.get(`${BASE}/${page.id}`, {
      params: {
        fields: 'instagram_business_account{id,username}',
        access_token: token,
      },
    });

    if (pageInfo.instagram_business_account) {
      return {
        pageId: page.id,
        pageName: page.name,
        pageToken: page.access_token,
        igUserId: pageInfo.instagram_business_account.id,
        igUsername: pageInfo.instagram_business_account.username,
      };
    }
  }

  throw new Error('No Instagram Business account found');
}

/* ================================================================ */
/*  MESSENGER — Engage with customers on Messenger                   */
/* ================================================================ */

export async function sendMessengerMessage(
  recipientId: string,
  message: string,
  accessToken: string,
) {
  const { data } = await axios.post(
    `${BASE}/me/messages`,
    {
      recipient: { id: recipientId },
      message: { text: message },
    },
    { params: { access_token: accessToken } },
  );
  return data;
}

export async function getMessengerConversations(pageId: string, accessToken: string) {
  const { data } = await axios.get(`${BASE}/${pageId}/conversations`, {
    params: {
      platform: 'messenger',
      fields: 'participants,messages{message,from,created_time}',
      access_token: accessToken,
    },
  });
  return data.data || [];
}

/* ================================================================ */
/*  PAGES API — Manage everything on your Page                       */
/* ================================================================ */

export async function getPageDetails(pageId: string, accessToken: string) {
  const { data } = await axios.get(`${BASE}/${pageId}`, {
    params: {
      fields: 'id,name,category,fan_count,followers_count,cover,picture',
      access_token: accessToken,
    },
  });
  return data;
}

export async function publishPagePost(
  pageId: string,
  message: string,
  accessToken: string,
  link?: string,
) {
  const payload: Record<string, string> = { message };
  if (link) payload.link = link;

  const { data } = await axios.post(`${BASE}/${pageId}/feed`, payload, {
    params: { access_token: accessToken },
  });
  return data;
}

export async function getPagePosts(pageId: string, accessToken: string, limit = 10) {
  const { data } = await axios.get(`${BASE}/${pageId}/feed`, {
    params: {
      fields: 'id,message,story,created_time,likes.summary(true),comments.summary(true)',
      limit,
      access_token: accessToken,
    },
  });
  return data.data || [];
}

export async function getPageInsights(pageId: string, accessToken: string) {
  const { data } = await axios.get(`${BASE}/${pageId}/insights`, {
    params: {
      metric: 'page_impressions,page_reach,page_fans,page_engaged_users',
      period: 'day',
      access_token: accessToken,
    },
  });
  return data.data || [];
}

/* ================================================================ */
/*  WHATSAPP — Connect with customers through WhatsApp               */
/* ================================================================ */

export async function sendWhatsAppMessage(
  phoneNumberId: string,
  to: string,
  message: string,
  accessToken: string,
) {
  const { data } = await axios.post(
    `${BASE}/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body: message },
    },
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  return data;
}

export async function sendWhatsAppTemplate(
  phoneNumberId: string,
  to: string,
  templateName: string,
  languageCode: string,
  components: object[],
  accessToken: string,
) {
  const { data } = await axios.post(
    `${BASE}/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: templateName, language: { code: languageCode }, components },
    },
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  return data;
}

export async function getWhatsAppBusinessProfile(
  phoneNumberId: string,
  accessToken: string,
) {
  const { data } = await axios.get(`${BASE}/${phoneNumberId}/whatsapp_business_profile`, {
    params: {
      fields: 'about,address,description,email,profile_picture_url,websites,vertical',
      access_token: accessToken,
    },
  });
  return data;
}

/* ================================================================ */
/*  IG PUBLISHING — Instagram Media Container API                     */
/* ================================================================ */

export async function createInstagramMediaContainer(
  igUserId: string,
  mediaUrl: string,
  caption: string,
  accessToken: string,
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL' = 'IMAGE',
) {
  const payload: Record<string, unknown> = {
    image_url: mediaUrl,
    caption: caption.slice(0, 2200),
    access_token: accessToken,
  };
  if (mediaType === 'VIDEO') {
    payload.media_type = 'VIDEO';
    payload.video_url = mediaUrl;
    delete payload.image_url;
  }

  const { data } = await axios.post(
    `${BASE}/${igUserId}/media`,
    payload,
  );
  return data as { id: string };
}

export async function publishInstagramMedia(
  igUserId: string,
  creationId: string,
  accessToken: string,
) {
  const { data } = await axios.post(
    `${BASE}/${igUserId}/media_publish`,
    { creation_id: creationId, access_token: accessToken },
  );
  return data as { id: string };
}

/* ================================================================ */
/*  THREADS API — Access the Threads API                             */
/* ================================================================ */

export async function getThreadsProfile(userId: string, accessToken: string) {
  const { data } = await axios.get(`https://graph.threads.net/v1.0/${userId}`, {
    params: {
      fields: 'id,username,name,threads_profile_picture_url,threads_biography',
      access_token: accessToken,
    },
  });
  return data;
}

export async function publishThreadsPost(
  userId: string,
  text: string,
  accessToken: string,
) {
  // Step 1: Create media container
  const { data: container } = await axios.post(
    `https://graph.threads.net/v1.0/${userId}/threads`,
    { media_type: 'TEXT', text },
    { params: { access_token: accessToken } },
  );

  // Step 2: Publish
  const { data: published } = await axios.post(
    `https://graph.threads.net/v1.0/${userId}/threads_publish`,
    { creation_id: container.id },
    { params: { access_token: accessToken } },
  );
  return published;
}

export async function getThreadsPosts(userId: string, accessToken: string, limit = 10) {
  const { data } = await axios.get(`https://graph.threads.net/v1.0/${userId}/threads`, {
    params: {
      fields: 'id,media_product_type,media_type,text,timestamp,like_count,replies_count',
      limit,
      access_token: accessToken,
    },
  });
  return data.data || [];
}

export async function replyToThread(
  mediaId: string,
  userId: string,
  text: string,
  accessToken: string,
) {
  const { data: container } = await axios.post(
    `https://graph.threads.net/v1.0/${userId}/threads`,
    { media_type: 'TEXT', text, reply_to_id: mediaId },
    { params: { access_token: accessToken } },
  );

  const { data: published } = await axios.post(
    `https://graph.threads.net/v1.0/${userId}/threads_publish`,
    { creation_id: container.id },
    { params: { access_token: accessToken } },
  );
  return published;
}

/* ================================================================ */
/*  MARKETING API — Create & manage ads, measure performance         */
/* ================================================================ */

export async function getAdAccounts(accessToken: string) {
  const { data } = await axios.get(`${BASE}/me/adaccounts`, {
    params: {
      fields: 'id,name,account_status,currency,amount_spent,balance',
      access_token: accessToken,
    },
  });
  return data.data || [];
}

export async function getCampaigns(adAccountId: string, accessToken: string) {
  const { data } = await axios.get(`${BASE}/${adAccountId}/campaigns`, {
    params: {
      fields: 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time',
      access_token: accessToken,
    },
  });
  return data.data || [];
}

export async function getAdInsights(
  adAccountId: string,
  accessToken: string,
  datePreset = 'last_7d',
) {
  const { data } = await axios.get(`${BASE}/${adAccountId}/insights`, {
    params: {
      fields: 'impressions,reach,clicks,spend,ctr,cpm,cpc,actions',
      date_preset: datePreset,
      access_token: accessToken,
    },
  });
  return data.data || [];
}

export async function createCampaign(
  adAccountId: string,
  name: string,
  objective: string,
  status: string,
  accessToken: string,
) {
  const { data } = await axios.post(
    `${BASE}/${adAccountId}/campaigns`,
    { name, objective, status, special_ad_categories: [] },
    { params: { access_token: accessToken } },
  );
  return data;
}

/* ================================================================ */
/*  AD LEADS — Capture & manage ad leads                             */
/* ================================================================ */

export async function getLeadForms(pageId: string, accessToken: string) {
  const { data } = await axios.get(`${BASE}/${pageId}/leadgen_forms`, {
    params: {
      fields: 'id,name,status,leads_count,created_time',
      access_token: accessToken,
    },
  });
  return data.data || [];
}

export async function getLeads(formId: string, accessToken: string, limit = 50) {
  const { data } = await axios.get(`${BASE}/${formId}/leads`, {
    params: {
      fields: 'id,created_time,field_data',
      limit,
      access_token: accessToken,
    },
  });
  return data.data || [];
}

/* ================================================================ */
/*  CATALOG API — Manage products with Catalog API                   */
/* ================================================================ */

export async function getProductCatalogs(businessId: string, accessToken: string) {
  const { data } = await axios.get(`${BASE}/${businessId}/owned_product_catalogs`, {
    params: {
      fields: 'id,name,product_count',
      access_token: accessToken,
    },
  });
  return data.data || [];
}

export async function getCatalogProducts(catalogId: string, accessToken: string, limit = 20) {
  const { data } = await axios.get(`${BASE}/${catalogId}/products`, {
    params: {
      fields: 'id,name,description,price,currency,availability,image_url,product_type',
      limit,
      access_token: accessToken,
    },
  });
  return data.data || [];
}

/* ================================================================ */
/*  LIVE VIDEO — Access the Live Video API                           */
/* ================================================================ */

export async function createLiveVideo(
  pageId: string,
  title: string,
  description: string,
  accessToken: string,
) {
  const { data } = await axios.post(
    `${BASE}/${pageId}/live_videos`,
    { title, description, status: 'LIVE_NOW' },
    { params: { access_token: accessToken } },
  );
  return data; // Returns { id, stream_url, secure_stream_url, embed_html }
}

export async function getLiveVideos(pageId: string, accessToken: string) {
  const { data } = await axios.get(`${BASE}/${pageId}/live_videos`, {
    params: {
      fields: 'id,title,status,live_views,broadcast_start_time,embed_html',
      access_token: accessToken,
    },
  });
  return data.data || [];
}

export async function endLiveVideo(videoId: string, accessToken: string) {
  const { data } = await axios.post(
    `${BASE}/${videoId}`,
    { end_live_video: true },
    { params: { access_token: accessToken } },
  );
  return data;
}

/* ================================================================ */
/*  OEMBED — Embed Facebook, Instagram & Threads content             */
/* ================================================================ */

export async function getOEmbed(url: string, accessToken: string) {
  // Detect which platform
  let endpoint = '';
  if (url.includes('instagram.com')) {
    endpoint = 'https://graph.facebook.com/v22.0/instagram_oembed';
  } else if (url.includes('threads.net')) {
    endpoint = 'https://graph.threads.net/oembed/';
  } else {
    endpoint = 'https://graph.facebook.com/v22.0/oembed_post';
  }

  const { data } = await axios.get(endpoint, {
    params: { url, access_token: accessToken },
  });
  return data;
}

/* ================================================================ */
/*  FUNDRAISERS — Share or create fundraisers on FB & IG             */
/* ================================================================ */

export async function getFundraisers(pageId: string, accessToken: string) {
  const { data } = await axios.get(`${BASE}/${pageId}/fundraisers`, {
    params: {
      fields: 'id,name,description,goal_amount,amount_raised,currency,end_time,status',
      access_token: accessToken,
    },
  });
  return data.data || [];
}

export async function createFundraiser(
  pageId: string,
  charityId: string,
  title: string,
  description: string,
  goalAmount: number,
  currency: string,
  endTime: string,
  accessToken: string,
) {
  const { data } = await axios.post(
    `${BASE}/${pageId}/fundraisers`,
    {
      charity_id: charityId,
      name: title,
      description,
      goal_amount: goalAmount,
      currency,
      end_time: endTime,
    },
    { params: { access_token: accessToken } },
  );
  return data;
}

/* ================================================================ */
/*  AUDIENCE NETWORK — Monetize with Meta Audience Network           */
/* ================================================================ */

export async function getAudienceNetworkStats(
  propertyId: string,
  accessToken: string,
  since: number,
  until: number,
) {
  const { data } = await axios.get(`${BASE}/${propertyId}/insights`, {
    params: {
      fields: 'impressions,filled_impressions,clicks,revenue',
      since,
      until,
      access_token: accessToken,
    },
  });
  return data.data || [];
}

export async function getAudienceNetworkProperties(businessId: string, accessToken: string) {
  const { data } = await axios.get(`${BASE}/${businessId}/an_placements`, {
    params: {
      fields: 'id,name,platform,format',
      access_token: accessToken,
    },
  });
  return data.data || [];
}

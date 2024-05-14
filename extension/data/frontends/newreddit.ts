// Frontend observer for new Reddit, implemented against jsAPI.

import TBLog from '../tblog';
import {type PlatformObserver, PlatformSlotDetails} from '.';

const log = TBLog('observer:new');

const JSAPI_CONSUMER_NAME = 'toolbox-platform-observer';

interface JSAPISubreddit {
    id: string;
    name: string;
    type: string;
}
interface JSAPIEvent extends CustomEvent {
    target: HTMLElement;
    // NOTE: Initial list pulled from https://reddit.com/r/redesign/wiki/jsapi.
    //       This list is probably imperfect and we should cross-reference
    //       TBListener instead of relying on that but I'm lazy
    detail: {
        type: 'post';
        data: {
            author: string;
            distinguishType: string | null | undefined;
            flair: unknown[];
            id: string;
            media: unknown;
            permalink: string;
            subreddit: JSAPISubreddit;
        };
    } | {
        type: 'subreddit';
        data: {
            id: string;
            displayText: string;
            name: string;
            title: string;
            url: string;
        };
    } | {
        type: 'postAuthor';
        data: {
            author: string;
            isModerator: boolean;
            post: {
                id: string;
            };
            subreddit: JSAPISubreddit;
        };
    } | {
        type: 'comment';
        data: {
            author: string;
            body: string;
            distinguishType: string | null;
            id: string;
            isStickied: boolean;
            isTopLevel: boolean;
            post: {
                id: string;
            };
            subreddit: JSAPISubreddit;
        };
    } | {
        type: 'commentAuthor';
        data: {
            author: string;
            isModerator: boolean;
            comment: {
                id: string;
            };
            post: {
                id: string;
            };
            subreddit: JSAPISubreddit;
        };
    } | {
        type: 'userHovercard';
        data: {
            user: {
                username: string;
                commentKarma: number;
                hasUserProfile: boolean;
                displayName: string;
                created: number;
                iconSize: number[];
                postKarma: number;
                isFollowing: null;
                accountIcon: string;
                isEmployee: boolean;
                url: string;
                bannerImage: string;
                hasVerifiedEmail: boolean;
                id: string;
            };
            contextId: string;
            subreddit: JSAPISubreddit;
        };
    };
}

type SlotRenderArgs<K extends keyof PlatformSlotDetails = keyof PlatformSlotDetails> = [K, PlatformSlotDetails[K]];

/** Maps data received from jsAPI events into standardized slot data. */
function mapEvent (event: JSAPIEvent): SlotRenderArgs | null {
    if (event.detail.type === 'postAuthor') {
        return ['submissionAuthor', {
            user: event.detail.data.author === '[deleted]' ? {deleted: true} : {
                deleted: false,
                name: event.detail.data.author,
            },
            subreddit: {
                name: event.detail.data.subreddit.name,
                fullname: event.detail.data.subreddit.id,
            },
            submission: {
                fullname: event.detail.data.post.id,
            },
            distinguishType: null, // TODO
            stickied: false, // TODO
        }];
    }
    if (event.detail.type === 'commentAuthor') {
        return ['commentAuthor', {
            user: event.detail.data.author === '[deleted]' ? {deleted: true} : {
                deleted: false,
                name: event.detail.data.author,
            },
            comment: {
                fullname: event.detail.data.comment.id,
            },
            subreddit: {
                fullname: event.detail.data.subreddit.id,
                name: event.detail.data.subreddit.name,
            },
            distinguishType: null, // TODO
            stickied: false, // TODO
        }];
    }

    return null;
}

export default (createRenderer => {
    document.addEventListener('reddit', event => {
        const e = event as JSAPIEvent; // life's too short to worry about this

        const target = e.target?.querySelector(`[data-name="${JSAPI_CONSUMER_NAME}"]`);
        if (!target || target.classList.contains('tb-target-seen')) {
            return;
        }

        target.classList.add('tb-target-seen');
        log.debug('saw new jsAPI event:', target, e.detail);

        let renderOptions = mapEvent(e);
        if (!renderOptions) {
            return;
        }
        target.appendChild(createRenderer(...renderOptions));
    }, true);

    const meta = document.createElement('meta');
    meta.name = 'jsapi.consumer';
    // TODO: this can be changed back to just `toolbox` once TBListener is gone
    meta.content = JSAPI_CONSUMER_NAME;
    document.head.appendChild(meta);
    meta.dispatchEvent(new CustomEvent('reddit.ready'));
    log.info('Connected to jsAPI');
}) satisfies PlatformObserver;

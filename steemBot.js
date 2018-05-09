// The minimum age of a post before it is evaluated by the bot (minutes)
const minimumPostAge = 30;
// The maximum age of a post after whitch it is ignored (minutes)
const maximumPostAge = 360;
// How many posts should be fetched
const postsToFetch = 100;
// How many votes should the post have, before the bot votes for it
// This helps filter out posts that bring no value to the comunity
const minimumUpvotes = 5;
// Weight of your vote (the procentage*100, so 58.25% would be 5825)
const voteWeight = 500;
// Whitch tags should the bot check
// I reccomend filling it with the subs you want to support
// For me it would be utopian-io, printing3d, science, technology
const tags = ["utopian-io"];
// If your voting power is lover that this value the bot will not vote
const minimumVotingPower = 3500;
// Configuration for commenting after upvote
const upvoteComments = {
    enabled: true,
    title: 'Upvote',
    body: 'Hi, I really like your content have an upvote.',
    botsSignature: true,
    tags: ['upvote', 'bot']
}

// Your username
const username = "";
// Your private posting key
const postingKey = "";

const Promise = require('bluebird');
const SteemAPI = Promise.promisifyAll(require('steem').api);
const SteemBroadcast = Promise.promisifyAll(require('steem').broadcast)
const steem = require('steem');
const sleep = require('sleep');


var now = new Date();
console.log("Running voting bot", now);
console.log("Voting as", username);
console.log("Voting in tags", tags);

/*
Deprecated function that votes for a specified post and relies on callbacks
*/
function voteForPost(post) {
    console.log("Voting for:", post.author, post.title, post.net_votes, post.permlink);
    steem.api.getAccounts([username], function (err, usr) {
        if (usr[0].voting_power > minimumVotingPower) {
            steem.broadcast.vote(
                postingKey,
                username,
                post.author,
                post.permlink,
                voteWeight,
                function (err, result) {
                    console.log(err);
                }
            );
        } else {
            console.log("Not voted, low voting power.", "Voting power", usr[0].voting_power)
        }
    });
}
/*
Asynchronous voting function with better controll over execution
*/
async function voteForPostAsync(post) {
    const accounts = await SteemAPI.getAccountsAsync([username])
    if (accounts[0].voting_power > minimumVotingPower) {
        try {
            const vote = await SteemBroadcast.voteAsync(
                postingKey,
                username,
                post.author,
                post.permlink,
                voteWeight
            )
            console.log("You have voted for", post.title)
            if(upvoteComments.enabled)
            {
                await commentAfterUpvote(post)

            }
        } catch (error) {
            console.error(error)
        }
    } else {
        console.error("Voting power is", accounts[0].voting_power, "that is too low!")
    }
}
/*
Function that leaves a comment on a post
*/
async function commentAfterUpvote(post) {
    try {
        var permlink = 'steembot-upvote-' + username + '-' + (new Date().toISOString().replace(/[^a-zA-Z0-9]+/g, '').toLowerCase());
        var body = upvoteComments.body
        if (upvoteComments.botsSignature) {
            body = upvoteComments.body + '<br><br>This post has been upvoted by a voting bot.<br><br>This bot is fully open source and you can check the code out on <a href="https://github.com/jtomes123/SteemVotingBot">Github</a>'
        }
        var comment = await SteemBroadcast.commentAsync(
            postingKey,
            post.author,
            post.permlink,
            username,
            permlink,
            upvoteComments.title,
            body, {
                tags: upvoteComments.tags,
                app: 'steemBot'
            }
        )
        console.log('The bot has left comment.')
    } catch (error) {
        console.error(error)
    }
}

// Checks if you have voted for this post before
function hasBeenVotedFor(post) {
    for (var i = 0; i < post.active_votes.length; i++) {
        if (post.active_votes[i].voter == username) {
            return true;
        }
    }
    return false;
}

/*
Runs bot for a steemit tag
*/
async function runBotForTagAsync(tag) {
    const posts = await SteemAPI.getDiscussionsByCreatedAsync({
        "tag": tag,
        "limit": postsToFetch
    })

    var len = posts.length;
    var postsVotedFor = 0;
    for (i = 0; i < len; i++) {
        var discussion = posts[i];
        var willVoteFor = true;

        // You can add your own custom conditions here behind the default ones
        if ((now.getTime() - (new Date(discussion.created + "Z")).getTime()) / 60000 < minimumPostAge)
            willVoteFor = false;
        else if ((now.getTime() - (new Date(discussion.created + "Z")).getTime()) / 60000 > maximumPostAge)
            willVoteFor = false;
        else if (discussion.net_votes < minimumUpvotes)
            willVoteFor = false;
        else if (hasBeenVotedFor(discussion))
            willVoteFor = false;
        if (willVoteFor) {
            postsVotedFor++;
            // There has to be a delay of at least 3 seconds between each vote.
            // The delay is 4000 milliseconds by default, just to be on the safe side.
            // If you get an error saying that you have to wait at least three seconds
            // between each vote you might have to adjust this value.

            //If you choose to also comment the minimum delay is 20 seconds,
            //the default is 22000 miliseconds
            await voteForPostAsync(discussion)
            if(upvoteComments.enabled)
                sleep.sleep(22)
            else
                sleep.sleep(4)
        }
    }
    console.log(postsVotedFor);
    var targetMilis = new Date().getTime() + 4000 * postsVotedFor + 4000;
}

/*
Deprecated funtion to run bot for a specified tag
*/
function runBotForTag(tag) {
    steem.api.getDiscussionsByCreated({
        "tag": tag,
        "limit": postsToFetch
    }, function (err, result) {
        if (err === null) {
            var i, len = result.length;
            var postsVotedFor = 0;
            for (i = 0; i < len; i++) {
                var discussion = result[i];
                var willVoteFor = true;

                // You can add your own custom conditions here behind the default ones
                if ((now.getTime() - (new Date(discussion.created + "Z")).getTime()) / 60000 < minimumPostAge)
                    willVoteFor = false;
                else if ((now.getTime() - (new Date(discussion.created + "Z")).getTime()) / 60000 > maximumPostAge)
                    willVoteFor = false;
                else if (discussion.net_votes < minimumUpvotes)
                    willVoteFor = false;
                else if (hasBeenVotedFor(discussion))
                    willVoteFor = false;
                if (willVoteFor) {
                    postsVotedFor++;

                    // There has to be a delay of at least 3 seconds between each vote.
                    // The delay is 4000 milliseconds by default, just to be on the safe side.
                    // If you get an error saying that you have to wait at least three seconds
                    // between each vote you might have to adjust this value.
                    setTimeout(voteForPost, postsVotedFor * 4000, discussion);
                }
            }
            console.log(postsVotedFor);
            var targetMilis = new Date().getTime() + 4000 * postsVotedFor + 4000;
        } else {
            console.log(err);
        }
    });

}

// Run the bot for every specified tag
async function runBot() {
    console.log("Bot initialised...")
    for(var i = 0, len = tags.length; i < len; i++) {
        console.log('Running for tag', tags[i])
        await runBotForTagAsync(tags[i]);
        console.log('Finished voting in this tag.')
    }
    console.log('Bot finished.')
}

if(username === "" || postingKey === "")
    console.error('Invalid username or posting key!')
else
    runBot()
// The minimum age of a post before it is evaluated by the bot (minutes)
var minimumPostAge = 30;
// The maximum age of a post after whitch it is ignored (minutes)
var maximumPostAge = 360;
// How many posts should be fetched
var postsToFetch = 100;
// How many votes should the post have, before the bot votes for it
// This helps filter out posts that bring no value to the comunity
var minimumUpvotes = 5;
// Weight of your vote (the procentage*100, so 58.25% would be 5825)
var voteWeight = 500;
// Whitch tags should the bot check
// I reccomend filling it with the subs you want to support
// For me it would be utopian-io, printing3d, science, technology
var tags = ["utopian-io"];
// If your voting power is lover that this value the bot will not vote
var minimumVotingPower = 3500;

// Your username
var username = "";
// Your private posting key
var postingKey = "";

var steem = require('steem');
var sleep = require('sleep');

var now = new Date();
console.log("Running voting bot", now);
console.log("Voting as", username);
console.log("Voting in tags", tags);

// Votes for a post
function voteForPost(post) {
    console.log("Voting for:", post.author, post.title, post.net_votes, post.permlink);
    steem.api.getAccounts([username], function(err, usr) {
        if(usr[0].voting_power > minimumVotingPower)
        {
            steem.broadcast.vote(
                postingKey,
                username,
                post.author,
                post.permlink,
                voteWeight,
                function(err, result) {
                  console.log(err);
                }
            );
        }
        else
        {
            console.log("Not voted, low voting power.", "Voting power", usr[0].voting_power)
        }
    });  
}
// Checks if you have voted for this post before
function hasBeenVotedFor(post) {
    for(var i = 0; i < post.active_votes.length; i++)
    {
        if (post.active_votes[i].voter == username) {
            return true;
        }
    }
    return false;
}
//Runs the bor for specified tag, tag should be string
function runBotForTag(tag) {
    steem.api.getDiscussionsByCreated({"tag": tag, "limit": postsToFetch}, function(err, result) {
        if (err === null) {
            var i, len = result.length;
            var postsVotedFor = 0;
            for (i = 0; i < len; i++) {
                var discussion = result[i];
                var willVoteFor = true;
                
                // You can add your own custom conditions here behind the default ones
                if((now.getTime() - (new Date(discussion.created + "Z")).getTime()) / 60000 < minimumPostAge)
                    willVoteFor = false;
                else if ((now.getTime() - (new Date(discussion.created + "Z")).getTime()) / 60000 > maximumPostAge)
                    willVoteFor = false;
                else if (discussion.net_votes < minimumUpvotes)
                    willVoteFor = false;
                else if (hasBeenVotedFor(discussion))
                    willVoteFor = false;
                if (willVoteFor)
                {
                    postsVotedFor++;
                    // There has to be a delay of at least 3 seconds between each vote.
                    // The delay is 4000 milliseconds by default, just to be on the safe side.
                    // If you get an error saying that you have to wait at least three seconds
                    // between each vote you might have to adjust this value.
                    setTimeout(voteForPost, postsVotedFor*4000, discussion);
                }
            }
            console.log(postsVotedFor);
            var targetMilis = new Date().getTime() + 4000*postsVotedFor + 4000;
        } else {
            console.log(err);
        }
    });

}

// Run the bot for every specified tag
for(var i = 0, len = tags.length; i < len; i++) {
    runBotForTag(tags[i]);
}

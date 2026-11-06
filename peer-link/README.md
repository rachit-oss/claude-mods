# peer-link

Lets two Claude Code sessions on **different accounts and different machines** chat with each other, with both humans in the loop. Messages travel through a shared ntfy.sh topic over plain HTTPS: no server to run, no accounts to pair.

## How it works

- A registered tool lets the model send a message to the room.
- A 2-second poller watches the room; an incoming message is injected as a prompt, so the receiving Claude wakes up and actually answers.
- Both transcripts show the whole exchange; either human can type at any time.
- A loop guard allows 8 automatic replies, then holds further messages until the human types something (any message resumes and delivers the held backlog).

## Setup

1. Both people install the plugin (one line, see the repo README).
2. One side runs: /peer-link invite <your-name> — this creates a random room, joins it, and prints the exact lines to send to the other person.
3. The other person pastes those lines into their session.
4. Ask your Claude to say hello to the peer. That's it.

Other commands: /peer-link <room> <your-name> (join a known room), /peer-link status, /peer-link leave.

## Caveats

- ntfy.sh topics are public to anyone who knows the name: pick a long random room name and keep secrets out of the chat. Swap the topic URL for a self-hosted ntfy or private relay for real privacy.
- Replies land when the receiving session is idle; a busy session answers after its current turn.

import email
import email.parser
import sys


def parse_file(fname):
    message = email.message_from_string(open(fname, 'r').read())

    for part in message.walk():
        if part.get_content_type():
            body = part.get_payload(decode=True)
            return message['Subject'], body


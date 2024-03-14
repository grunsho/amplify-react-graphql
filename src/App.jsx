/* eslint-disable no-extra-boolean-cast */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import "./App.css";
import "@aws-amplify/ui-react/styles.css";
import { generateClient } from "aws-amplify/api";
import { getUrl, uploadData, remove } from "aws-amplify/storage";
import {
  Button,
  Flex,
  Grid,
  Heading,
  Image,
  Text,
  TextField,
  TextAreaField,
  View,
  withAuthenticator,
} from "@aws-amplify/ui-react";
import { StorageManager } from "@aws-amplify/ui-react-storage";
import { listNotes } from "./graphql/queries";
import {
  createNote as createNoteMutation,
  deleteNote as deleteNoteMutation,
} from "./graphql/mutations";

const client = generateClient();

const App = ({ signOut }) => {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const apiData = await client.graphql({ query: listNotes });
    const notesFromAPI = apiData.data.listNotes.items;
    await Promise.all(
      notesFromAPI.map(async (note) => {
        if (note.image) {
          const url = await getUrl({ key: note.id });
          note.image = url;
        }
        return note;
      })
    );
    setNotes(notesFromAPI);
  }

  async function createNote(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const image = form.get("image");
    const data = {
      name: form.get("name"),
      description: form.get("description"),
      image: image.name,
    };
    const result = await client.graphql({
      query: createNoteMutation,
      variables: { input: data },
    });
    if (!!data.image)
      await uploadData({ key: result.data.createNote.id, data: image }).result;
    fetchNotes();
    event.target.reset();
  }

  async function deleteNote({ id }) {
    const newNotes = notes.filter((note) => note.id !== id);
    setNotes(newNotes);
    await remove({ key: id });
    await client.graphql({
      query: deleteNoteMutation,
      variables: { input: { id } },
    });
  }

  return (
    <View className="App">
      <Heading level={1}>My Notes App</Heading>
      <View as="form" margin="3rem 0" onSubmit={createNote}>
        <Flex
          direction="column"
          marginInline="auto"
          justifyContent="space-between"
          width="50%"
        >
          <TextField
            name="name"
            placeholder="Note Name"
            label="Note Name"
            labelHidden
            required
          />
          <TextAreaField
            name="description"
            placeholder="Note Description"
            label="Note Description"
            labelHidden
            required
          />
          <View
            name="image"
            as="input"
            type="file"
            style={{ alignSelf: "center" }}
          />
          {/* <StorageManager
            acceptedFileTypes={["image/*"]}
            accessLevel="guest"
            maxFileCount={1}
            isResumable
          /> */}
          <Button type="submit" variation="primary">
            Create Note
          </Button>
        </Flex>
      </View>

      <Heading level={2}>Current Notes</Heading>
      <View margin="3rem 0">
        {notes.map((note) => (
          <Flex
            key={note.id || note.name}
            direction="row"
            justifyContent="center"
            alignItems="center"
          >
            <Text as="strong" fontWeight={700}>
              {note.name}
            </Text>
            <Text as="span">{note.description}</Text>
            {note.image && (
              <Image
                src={note.image.url.href}
                alt={`visual aid for ${note.name}`}
                style={{ width: 200 }}
              />
            )}
            <Button variation="link" onClick={() => deleteNote(note)}>
              Delete note
            </Button>
          </Flex>
        ))}
      </View>
      <Button onClick={signOut}>Sign Out</Button>
    </View>
  );
};

export default withAuthenticator(App);

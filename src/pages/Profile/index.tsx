import React, { useRef, useCallback, useState } from 'react';

import {
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
  Button as ButtonRN,
} from 'react-native';

import * as ImagePicker from 'react-native-image-picker/src';

import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { Form } from '@unform/mobile';
import { FormHandles } from '@unform/core';
import * as Yup from 'yup';
import Modal from 'react-native-modal';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import api from '../../services/api';
import getValidationErrors from '../../utils/getValidationErrors';
import Input from '../../components/Input';
import Button from '../../components/Button';
import {
  Header,
  BackButton,
  HeaderTitle,
  LogoutButton,
  Container,
  ScrollContainer,
  UserAvatarButton,
  UserAvatar,
  UploadButton,
} from './styles';

import { useAuth } from '../../hooks/auth';

interface ProfileFormData {
  name: string;
  email: string;
  old_password: string;
  password: string;
  password_confirmation: string;
}

const Profile: React.FC = () => {
  const { user, signOut, updateUser } = useAuth();
  const formRef = useRef<FormHandles>(null);
  const navigation = useNavigation();

  const emailInputRef = useRef<TextInput>(null);
  const oldPasswordInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const [showModalUpdateAvatar, setShowModalUpdateAvatar] = useState(false);

  const logout = useCallback(() => {
    signOut();
  }, [signOut]);

  const handleProfile = useCallback(
    async (data: ProfileFormData) => {
      try {
        formRef.current?.setErrors({});

        const schema = Yup.object().shape({
          name: Yup.string().required('Nome obrigatório'),
          email: Yup.string()
            .required('E-mail obrigatório')
            .email('Digite um e-mail válido'),
          old_password: Yup.string(),
          password: Yup.string().when('old_password', {
            is: val => !!val.length,
            then: Yup.string().required('Campo obrigatório'),
            otherwise: Yup.string(),
          }),
          password_confirmation: Yup.string()
            .when('old_password', {
              is: val => !!val.length,
              then: Yup.string().required('Campo obrigatório'),
              otherwise: Yup.string(),
            })
            .oneOf([Yup.ref('password')], 'Confirmação incorreta'),
        });

        await schema.validate(data, {
          abortEarly: false,
        });

        const {
          name,
          email,
          old_password,
          password,
          password_confirmation,
        } = data;

        const formData = {
          name,
          email,
          ...(old_password
            ? {
                old_password,
                password,
                password_confirmation,
              }
            : {}),
        };

        const response = await api.put('/profile', formData);

        updateUser(response.data);

        Alert.alert('Perfil atualizado com sucesso!');

        navigation.goBack();
      } catch (err) {
        if (err instanceof Yup.ValidationError) {
          const errors = getValidationErrors(err);

          formRef.current?.setErrors(errors);

          return;
        }

        Alert.alert(
          'Erro na atualização do perfil',
          'Ocorreu um erro ao atualizar seu perfil, tente novamente.',
        );
      }
    },
    [navigation, updateUser],
  );

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const toggleModal = useCallback(() => {
    setShowModalUpdateAvatar(!showModalUpdateAvatar);
  }, [showModalUpdateAvatar]);

  const updatePhotoFromCamera = useCallback(() => {
    ImagePicker.launchCamera(
      {
        mediaType: 'photo',
        saveToPhotos: true,
        quality: 0.5,
      },
      async response => {
        const data = new FormData();

        data.append('avatar', {
          type: 'image/jpeg',
          name: `${user.id}.jpg`,
          uri: response.uri,
        });

        const apiResponse = await api.patch('users/avatar', data);

        await updateUser(apiResponse.data);
        toggleModal();
      },
    );
  }, [toggleModal, updateUser, user.id]);

  const updatePhotoFromGallery = useCallback(() => {
    ImagePicker.launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.5,
      },
      async response => {
        const data = new FormData();

        data.append('avatar', {
          type: 'image/jpeg',
          name: `${user.id}.jpg`,
          uri: response.uri,
        });

        const apiResponse = await api.patch('users/avatar', data);

        await updateUser(apiResponse.data);
        toggleModal();
      },
    );
  }, [toggleModal, updateUser, user.id]);

  return (
    <>
      <KeyboardAwareScrollView enableAutomaticScroll>
        <Header>
          <BackButton onPress={handleGoBack}>
            <Icon name="arrow-left" size={24} color="#999591" />
          </BackButton>

          <HeaderTitle> Meu perfil</HeaderTitle>

          <LogoutButton onPress={logout}>
            <Icon name="power" size={24} color="#999591" />
          </LogoutButton>
        </Header>

        <ScrollContainer>
          <Container>
            <UserAvatarButton onPress={toggleModal}>
              <UserAvatar source={{ uri: user.avatar_url }} />
            </UserAvatarButton>

            <Form
              initialData={user}
              ref={formRef}
              onSubmit={handleProfile}
              style={{ width: '100%' }}
            >
              <Input
                autoCapitalize="words"
                name="name"
                icon="user"
                placeholder="Nome"
                returnKeyType="next"
                onSubmitEditing={() => {
                  emailInputRef.current?.focus();
                }}
              />

              <Input
                ref={emailInputRef}
                keyboardType="email-address"
                autoCorrect={false}
                autoCapitalize="none"
                name="email"
                icon="mail"
                placeholder="E-mail"
                returnKeyType="next"
                onSubmitEditing={() => {
                  oldPasswordInputRef.current?.focus();
                }}
              />

              <Input
                ref={oldPasswordInputRef}
                secureTextEntry
                name="old_password"
                icon="lock"
                placeholder="Senha atual"
                containerStyle={{ marginTop: 16 }}
                textContentType="newPassword"
                returnKeyType="next"
                onSubmitEditing={() => {
                  passwordInputRef.current?.focus();
                }}
              />

              <Input
                ref={passwordInputRef}
                secureTextEntry
                name="password"
                icon="lock"
                placeholder="Nova senha"
                textContentType="newPassword"
                returnKeyType="next"
                onSubmitEditing={() => {
                  confirmPasswordInputRef.current?.focus();
                }}
              />

              <Input
                ref={confirmPasswordInputRef}
                secureTextEntry
                name="password_confirmation"
                icon="lock"
                placeholder="Confirmar Senha"
                textContentType="newPassword"
                returnKeyType="send"
                onSubmitEditing={() => formRef.current?.submitForm()}
              />

              <Button onPress={() => formRef.current?.submitForm()}>
                Confirmar mudanças
              </Button>
            </Form>
          </Container>
        </ScrollContainer>
      </KeyboardAwareScrollView>
      <Modal
        isVisible={showModalUpdateAvatar}
        backdropOpacity={0.9}
        backdropColor="#3e3b47"
      >
        <UploadButton>
          <ButtonRN title="Usar câmera" onPress={updatePhotoFromCamera} />
        </UploadButton>
        <UploadButton>
          <ButtonRN
            title="Selecionar da galeria"
            onPress={updatePhotoFromGallery}
          />
        </UploadButton>
        <UploadButton>
          <ButtonRN title="Cancelar" onPress={toggleModal} color="red" />
        </UploadButton>
      </Modal>
    </>
  );
};

export default Profile;

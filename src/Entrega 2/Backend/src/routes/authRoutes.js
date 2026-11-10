const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { validarCampos } = require("../utils/validacao");

function criarAuthRoutes(autenticacaoService, autenticar) {
    const router = express.Router();

    router.post(
        "/registro",
        asyncHandler(async (req, res) => {
            const dados = validarCampos(req.body, {
                nome: { tipo: "texto", obrigatorio: true, min: 3, max: 120 },
                email: { tipo: "email", obrigatorio: true },
                senha: { tipo: "senha", obrigatorio: true, min: 8 },
                perfil: {
                    tipo: "enum",
                    valores: ["administrador", "professor", "responsavel"]
                },
                codigoConvite: { tipo: "texto", max: 9 }
            });

            const usuario = await autenticacaoService.registrar(dados);

            res.status(201).json({
                sucesso: true,
                dados: { usuario }
            });
        })
    );

    router.post(
        "/login",
        asyncHandler(async (req, res) => {
            const dados = validarCampos(req.body, {
                email: { tipo: "email", obrigatorio: true },
                senha: {
                    tipo: "senha",
                    obrigatorio: true,
                    min: 1
                },
                perfil: {
                    tipo: "enum",
                    valores: ["administrador", "professor", "responsavel"]
                }
            });

            const resultado = await autenticacaoService.login(
                dados.email,
                dados.senha,
                dados.perfil || null
            );

            res.json({
                sucesso: true,
                dados: resultado
            });
        })
    );

    router.get(
        "/me",
        autenticar,
        asyncHandler(async (req, res) => {
            res.json({
                sucesso: true,
                dados: { usuario: req.usuario }
            });
        })
    );

    router.put(
        "/perfil",
        autenticar,
        asyncHandler(async (req, res) => {
            const dados = validarCampos(req.body, {
                nome: { tipo: "texto", obrigatorio: true, min: 3, max: 120 },
                email: { tipo: "email", obrigatorio: true },
                telefone: { tipo: "texto", max: 20 }
            });

            const usuario = await autenticacaoService.atualizarPerfil(
                req.usuario.idUsuario,
                dados
            );

            res.json({
                sucesso: true,
                dados: { usuario }
            });
        })
    );

    return router;
}

module.exports = criarAuthRoutes;
